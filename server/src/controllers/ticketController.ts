import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { Status, Priority } from '@prisma/client';
import { sendTicketCreatedEmail, sendTicketAssignedEmail } from '../utils/emailService';
import { getIO } from '../utils/socket';
import { logActivity } from '../utils/activityLogger';
import { createNotification } from '../utils/notification';

import { AuthenticatedRequest } from '../types';

export const createTicket = async (req: AuthenticatedRequest, res: Response) => {
    const { title, description, priority, categoryId, assigneeId, assigneeIds, externalReference } = req.body;
    const creatorId = req.user.id;

    // Build list of target assignee IDs
    const targetAssigneeIds: number[] = [];
    if (assigneeIds && Array.isArray(assigneeIds)) {
        assigneeIds.forEach((id: string | number) => targetAssigneeIds.push(typeof id === 'string' ? parseInt(id) : id));
    } else if (assigneeId) {
        targetAssigneeIds.push(parseInt(assigneeId));
    }

    // MANDATORY ASSIGNMENT CHECK
    if (targetAssigneeIds.length === 0) {
        return res.status(400).json({ message: 'É obrigatório selecionar pelo menos um responsável para o ticket.' });
    }

    try {
        // Generate Ticket Number (YYYY-SEQ)
        const date = new Date();
        const year = date.getFullYear().toString();

        // Find last ticket created this year that has a ticketNumber
        const lastTicket = await prisma.ticket.findFirst({
            where: {
                ticketNumber: {
                    startsWith: year
                }
            },
            orderBy: {
                ticketNumber: 'desc'
            }
        });

        let sequence = 1;
        if (lastTicket && lastTicket.ticketNumber) {
            const parts = lastTicket.ticketNumber.split('-');
            if (parts.length === 2) {
                sequence = parseInt(parts[1]) + 1;
            }
        }

        const ticketNumber = `${year}-${sequence.toString().padStart(4, '0')}`;

        // Determine assignment strategy
        let finalAssigneeId: number | null = null;
        let potentialAssigneesConnect: any = undefined;

        if (targetAssigneeIds.length === 1) {
            // Single assignee: distinct assignment
            finalAssigneeId = targetAssigneeIds[0];
        } else {
            // Multiple assignees: shared ticket (potential assignees)
            // Leave assigneeId as null, link all to potentialAssignees
            potentialAssigneesConnect = {
                connect: targetAssigneeIds.map(id => ({ id }))
            };
        }

        const ticket = await prisma.ticket.create({
            data: {
                title,
                description,
                priority: priority || 'MEDIUM',
                categoryId: parseInt(categoryId),
                creatorId: req.user.id,
                assigneeId: finalAssigneeId,
                externalReference,
                ticketNumber,
                potentialAssignees: potentialAssigneesConnect
            },
            include: {
                creator: true,
                assignee: true,
                category: true,
                potentialAssignees: true
            }
        });

        // Log activity
        await logActivity(req.user.id, ticket.id, 'TICKET_CREATED', `Ticket criado: ${ticket.title} (${ticket.ticketNumber})`);

        // Send email to creator
        if (req.user.email) {
            sendTicketCreatedEmail(req.user.email, ticket.id, ticket.title).catch(console.error);
        }

        // Send notifications/emails to assignees
        // If assigneeId is set, notify that person.
        // If potentialAssignees has people, notify all of them.

        const recipients = [];
        if (ticket.assignee) {
            recipients.push(ticket.assignee);
        } else if (ticket.potentialAssignees && ticket.potentialAssignees.length > 0) {
            recipients.push(...ticket.potentialAssignees);
        }

        for (const user of recipients) {
            if (user.email) {
                // Determine message based on type
                const isShared = !ticket.assigneeId;
                const msg = isShared
                    ? `Foi partilhado consigo o ticket ${ticket.ticketNumber}: ${ticket.title}`
                    : `Foi-lhe atribuído o ticket ${ticket.ticketNumber}: ${ticket.title}`;

                const displayId = ticket.ticketNumber || ticket.id;
                sendTicketAssignedEmail(user.email, displayId, ticket.title).catch(console.error);
                createNotification(
                    user.id,
                    'Ticket Atribuído',
                    msg,
                    'TICKET_ASSIGNED',
                    `/tickets/${ticket.id}`
                );
            }
        }

        res.status(201).json(ticket);
    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({ message: 'Erro ao criar ticket' });
    }
};

export const getTickets = async (req: AuthenticatedRequest, res: Response) => {
    const { status, priority, category, assignedTo, createdBy, search, startDate, endDate, page = 1, limit = 10 } = req.query;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    // 🔒 SEGURANÇA: Utilizadores regulares só veem SEUS tickets
    if (!isAdmin) {
        where.OR = [
            { creatorId: userId },
            { assigneeId: userId },
            {
                potentialAssignees: { some: { id: userId } },
                assigneeId: null
            }
        ];
    }

    // Filtros adicionais (só admin pode ver tickets de outros)
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = { name: category };

    // Query params assignedTo e createdBy (respeitando permissões)
    if (assignedTo) {
        const targetUserId = parseInt(assignedTo as string);
        // Não-admin só pode filtrar por si mesmo
        if (!isAdmin && targetUserId !== userId) {
            return res.status(403).json({ message: 'Sem permissão para ver tickets de outros utilizadores' });
        }
        where.assigneeId = targetUserId;
    }

    if (createdBy) {
        const targetUserId = parseInt(createdBy as string);
        // Não-admin só pode filtrar por si mesmo
        if (!isAdmin && targetUserId !== userId) {
            return res.status(403).json({ message: 'Sem permissão para ver tickets de outros utilizadores' });
        }
        where.creatorId = targetUserId;
    }

    if (search) {
        where.OR = [
            { title: { contains: search as string, mode: 'insensitive' } },
            { description: { contains: search as string, mode: 'insensitive' } },
            { externalReference: { contains: search as string, mode: 'insensitive' } }
        ];
    }

    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    try {
        const [tickets, total] = await Promise.all([
            prisma.ticket.findMany({
                where,
                include: {
                    creator: { select: { id: true, name: true } },
                    assignee: { select: { id: true, name: true } },
                    category: true
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum
            }),
            prisma.ticket.count({ where })
        ]);

        res.json({
            data: tickets,
            meta: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao carregar tickets' });
    }
};

export const getTicket = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const ticket = await prisma.ticket.findUnique({
            where: { id: parseInt(id) },
            include: {
                creator: { select: { id: true, name: true } },
                assignee: { select: { id: true, name: true } },
                category: true,
                comments: {
                    include: {
                        user: { select: { id: true, name: true } },
                        attachments: true
                    },
                    orderBy: { createdAt: 'asc' }
                },
                attachments: true,
                potentialAssignees: { select: { id: true, name: true } }
            }
        });
        if (!ticket) return res.status(404).json({ message: 'Ticket não encontrado' });
        res.json(ticket);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao carregar ticket' });
    }
};

export const addComment = async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    try {
        const comment = await prisma.comment.create({
            data: {
                content,
                ticketId: parseInt(id),
                userId
            },
            include: { user: { select: { id: true, name: true, avatarUrl: true } } } // Include avatarUrl
        });

        // Log activity
        await logActivity(userId, parseInt(id), 'COMMENT_ADDED', `Comentário adicionado ao ticket #${id}`);

        // Emit socket event
        getIO().emit('comment:added', { ticketId: parseInt(id), comment });

        // Notify ticket creator if not the commenter
        const ticket = await prisma.ticket.findUnique({ where: { id: parseInt(id) } });
        if (ticket && ticket.creatorId !== userId) {
            createNotification(
                ticket.creatorId,
                'Novo Comentário',
                `Novo comentário no ticket ${ticket.ticketNumber}`,
                'COMMENT_ADDED',
                `/tickets/${id}`
            );
        }
        // Notify assignee if not the commenter and not the creator (to avoid double notify)
        if (ticket && ticket.assigneeId && ticket.assigneeId !== userId && ticket.assigneeId !== ticket.creatorId) {
            createNotification(
                ticket.assigneeId,
                'Novo Comentário',
                `Novo comentário no ticket ${ticket.ticketNumber}`,
                'COMMENT_ADDED',
                `/tickets/${id}`
            );
        }

        res.status(201).json(comment);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao adicionar comentário' });
    }
};

export const updateTicket = async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status, priority, assigneeId, title, description, categoryId, externalReference } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    try {
        const ticket = await prisma.ticket.findUnique({
            where: { id: parseInt(id) },
            include: { potentialAssignees: { select: { id: true } } }
        });
        if (!ticket) return res.status(404).json({ message: 'Ticket não encontrado' });

        // 🔒 VALIDAÇÃO DE PERMISSÕES
        const isCreator = ticket.creatorId === userId;
        const isAssignee = ticket.assigneeId === userId;
        const isPotentialAssignee = ticket.potentialAssignees.some(u => u.id === userId);

        // Logic check regarding claiming
        const isClaiming = isPotentialAssignee && !ticket.assigneeId && status === 'IN_PROGRESS';

        // Caso 1: Assignee pode APENAS mudar status para RESOLVED ou IN_PROGRESS (se estiver OPEN)
        if (isAssignee && !isCreator && !isAdmin) {
            // Allow transition from OPEN to IN_PROGRESS
            const isStartingProgress = ticket.status === 'OPEN' && status === 'IN_PROGRESS';
            const isResolving = status === 'RESOLVED';

            if (!status || (!isResolving && !isStartingProgress)) {
                return res.status(403).json({
                    message: 'Utilizador atribuído só pode iniciar progresso ou resolver o ticket'
                });
            }
            // Não pode alterar outros campos
            if (priority || assigneeId || title || description || categoryId || externalReference) {
                return res.status(403).json({
                    message: 'Sem permissão para editar outros campos do ticket'
                });
            }
        }

        // Caso 2: Não é criador, assignee ou admin
        if (!isCreator && !isAssignee && !isAdmin) {
            // Se for potential assignee e estiver a reclamar o ticket (Status -> IN_PROGRESS), permitimos
            if (!isClaiming) {
                return res.status(403).json({ message: 'Sem permissão para editar este ticket' });
            }
        }

        // Determine new assignee ID
        // If claiming, force self-assign. Otherwise use provided assigneeId (if permitted) or undefined
        let newAssigneeId = undefined;
        if (isClaiming) {
            newAssigneeId = userId;
        } else if (assigneeId) {
            newAssigneeId = parseInt(assigneeId);
        }

        // Caso 3: Criador ou Admin podem editar tudo (e claimers só atualizam isso)
        const updatedTicket = await prisma.ticket.update({
            where: { id: parseInt(id) },
            data: {
                status,
                priority,
                assigneeId: newAssigneeId,
                title,
                description,
                categoryId: categoryId ? parseInt(categoryId) : undefined,
                externalReference
            },
            include: { assignee: true }
        });

        // Log activity
        if (status && status !== ticket.status) {
            if (status === 'IN_PROGRESS' && ticket.status === 'OPEN' && (isAssignee || isClaiming)) {
                await logActivity(req.user.id, ticket.id, 'STATUS_CHANGED', `Ticket visualizado/reclamado: Estado alterado para Em Progresso`);
            } else {
                await logActivity(req.user.id, ticket.id, 'STATUS_CHANGED', `Estado alterado para ${status}`);
            }
        }
        if (priority && priority !== ticket.priority) await logActivity(req.user.id, ticket.id, 'PRIORITY_CHANGED', `Prioridade alterada para ${priority}`);

        // Log assignment change
        if (updatedTicket.assigneeId && updatedTicket.assigneeId !== ticket.assigneeId) {
            await logActivity(req.user.id, ticket.id, 'ASSIGNEE_CHANGED', `Atribuído a ${updatedTicket.assignee?.name || 'ninguém'}`);

            // Check if assignee changed and send email
            if (updatedTicket.assignee && updatedTicket.assignee.email) {
                const displayId = updatedTicket.ticketNumber || updatedTicket.id;
                sendTicketAssignedEmail(updatedTicket.assignee.email, displayId, updatedTicket.title).catch(console.error);
                createNotification(
                    updatedTicket.assignee.id,
                    'Ticket Reclamado/Atribuído',
                    `Foi-lhe atribuído o ticket ${updatedTicket.ticketNumber}: ${updatedTicket.title}`,
                    'TICKET_ASSIGNED',
                    `/tickets/${updatedTicket.id}`
                );
            }
        }

        if (title && title !== ticket.title) await logActivity(req.user.id, ticket.id, 'TICKET_UPDATED', `Título atualizado`);

        // Emit socket event
        getIO().emit('ticket:updated', updatedTicket);

        res.json(updatedTicket);
    } catch (error) {
        console.error('Error updating ticket:', error);
        res.status(500).json({ message: 'Erro ao atualizar ticket' });
    }
};

export const deleteTicket = async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
        const ticket = await prisma.ticket.findUnique({ where: { id: parseInt(id) } });
        if (!ticket) return res.status(404).json({ message: 'Ticket não encontrado' });

        // Check permissions: Creator or Admin
        if (ticket.creatorId !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Não tem permissão para apagar este ticket' });
        }

        // Delete related data first (cascade should handle this but let's be safe/explicit if needed, or rely on cascade)
        // Prisma schema doesn't show explicit cascade delete on all relations, so manual delete is safer.
        await prisma.attachment.deleteMany({ where: { ticketId: parseInt(id) } });
        await prisma.comment.deleteMany({ where: { ticketId: parseInt(id) } });
        await prisma.activity.deleteMany({ where: { ticketId: parseInt(id) } });

        await prisma.ticket.delete({ where: { id: parseInt(id) } });

        // Log activity (system level? or just skip since ticket is gone)
        // getIO().emit('ticket:deleted', id); // If we had this event

        res.json({ message: 'Ticket apagado com sucesso' });
    } catch (error) {
        console.error('Error deleting ticket:', error);
        res.status(500).json({ message: 'Erro ao apagar ticket' });
    }
};

export const cleanupTickets = async (req: AuthenticatedRequest, res: Response) => {
    // Ideally protect this with ADMIN role
    // if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });

    try {
        await prisma.attachment.deleteMany({});
        await prisma.comment.deleteMany({});
        await prisma.activity.deleteMany({ where: { ticketId: { not: null } } });
        await prisma.ticket.deleteMany({});

        res.json({ message: 'Todos os tickets foram apagados com sucesso.' });
    } catch (error) {
        console.error('Error cleaning up tickets:', error);
        res.status(500).json({ message: 'Erro ao limpar tickets' });
    }
};

import { supabase } from '../config/supabase';

export const uploadAttachment = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { commentId } = req.body;

    if (!req.file) {
        return res.status(400).json({ message: 'Nenhum ficheiro carregado' });
    }

    try {
        const ticketId = parseInt(id);

        // Gerar nome único do ficheiro
        const timestamp = Date.now();
        // Sanitize filename to avoid issues
        const sanitizedName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${ticketId}/${timestamp}-${sanitizedName}`;

        // Upload para Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('ticket-attachments')
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype,
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error('Supabase upload error:', uploadError);
            return res.status(500).json({ message: 'Erro ao fazer upload para storage' });
        }

        // Obter URL pública
        const { data: { publicUrl } } = supabase.storage
            .from('ticket-attachments')
            .getPublicUrl(fileName);

        const attachment = await prisma.attachment.create({
            data: {
                url: publicUrl,
                name: req.file.originalname,
                ticketId: ticketId,
                commentId: commentId ? parseInt(commentId) : null
            }
        });
        res.status(201).json(attachment);
    } catch (error) {
        console.error('Error uploading attachment:', error);
        res.status(500).json({ message: 'Erro ao carregar ficheiro' });
    }
};

export const deleteAttachment = async (req: AuthenticatedRequest, res: Response) => {
    const { id, attachmentId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    try {
        const attachment = await prisma.attachment.findUnique({
            where: { id: parseInt(attachmentId) },
            include: { ticket: true }
        });

        if (!attachment) {
            return res.status(404).json({ message: 'Anexo não encontrado' });
        }

        // Check permissions
        if (!isAdmin && attachment.ticket.creatorId !== userId && attachment.ticket.assigneeId !== userId) {
            return res.status(403).json({ message: 'Sem permissão para apagar este anexo' });
        }

        // Extract path from URL
        // URL format: https://[project].supabase.co/storage/v1/object/public/ticket-attachments/[ticketId]/[filename]
        const urlParts = attachment.url.split('/ticket-attachments/');
        if (urlParts.length > 1) {
            const filePath = urlParts[1];

            // Delete from Supabase Storage
            const { error: deleteError } = await supabase.storage
                .from('ticket-attachments')
                .remove([filePath]);

            if (deleteError) {
                console.error('Supabase delete error:', deleteError);
                // Continue to delete from DB even if storage delete fails (orphaned file is better than broken UI)
            }
        }

        await prisma.attachment.delete({
            where: { id: parseInt(attachmentId) }
        });

        res.json({ message: 'Anexo apagado com sucesso' });
    } catch (error) {
        console.error('Error deleting attachment:', error);
        res.status(500).json({ message: 'Erro ao apagar anexo' });
    }
};
export const downloadAttachment = async (req: AuthenticatedRequest, res: Response) => {
    const { id, attachmentId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    try {
        const attachment = await prisma.attachment.findUnique({
            where: { id: parseInt(attachmentId) },
            include: { ticket: true }
        });

        if (!attachment) {
            return res.status(404).json({ message: 'Anexo não encontrado' });
        }

        // Check permissions (same as viewing ticket)
        if (!isAdmin && attachment.ticket.creatorId !== userId && attachment.ticket.assigneeId !== userId) {
            return res.status(403).json({ message: 'Sem permissão para transferir este anexo' });
        }

        // Extract path from URL
        // URL format: https://[project].supabase.co/storage/v1/object/public/ticket-attachments/[ticketId]/[filename]
        const urlParts = attachment.url.split('/ticket-attachments/');
        if (urlParts.length <= 1) {
            return res.status(400).json({ message: 'URL de anexo inválido' });
        }

        const filePath = urlParts[1];

        // Download from Supabase Storage
        const { data, error } = await supabase.storage
            .from('ticket-attachments')
            .download(filePath);

        if (error || !data) {
            console.error('Supabase download error:', error);
            return res.status(500).json({ message: 'Erro ao transferir ficheiro do storage' });
        }

        // Set headers for download
        res.setHeader('Content-Disposition', `attachment; filename="${attachment.name}"`);
        res.setHeader('Content-Type', data.type);

        // Stream the file to the client
        const buffer = await data.arrayBuffer();
        res.send(Buffer.from(buffer));

    } catch (error) {
        console.error('Error downloading attachment:', error);
        res.status(500).json({ message: 'Erro ao processar transferência' });
    }
};
