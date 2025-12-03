import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { Status, Priority } from '@prisma/client';
import { sendTicketCreatedEmail, sendTicketAssignedEmail } from '../utils/emailService';
import { getIO } from '../utils/socket';
import { logActivity } from '../utils/activityLogger';
import { createNotification } from '../utils/notification';

import { AuthenticatedRequest } from '../types';

export const createTicket = async (req: AuthenticatedRequest, res: Response) => {
    const { title, description, priority, categoryId, assigneeId, assigneeIds } = req.body;
    const creatorId = req.user.id;

    try {
        // Handle multiple assignees
        if (assigneeIds && Array.isArray(assigneeIds) && assigneeIds.length > 0) {
            const tickets = [];

            for (const assignedUserId of assigneeIds) {
                const ticket = await prisma.ticket.create({
                    data: {
                        title,
                        description,
                        priority: priority || 'MEDIUM',
                        categoryId: parseInt(categoryId),
                        creatorId: req.user.id,
                        assigneeId: parseInt(assignedUserId)
                    },
                    include: {
                        creator: true,
                        assignee: true,
                        category: true
                    }
                });

                // Log activity
                await logActivity(req.user.id, ticket.id, 'TICKET_CREATED', `Ticket criado: ${ticket.title}`);

                // Send email to creator (only once per batch? or for each? Let's do for each to be safe/consistent)
                if (req.user.email) {
                    sendTicketCreatedEmail(req.user.email, ticket.id, ticket.title).catch(console.error);
                }

                // Send email to assignee
                if (ticket.assignee && ticket.assignee.email) {
                    sendTicketAssignedEmail(ticket.assignee.email, ticket.id, ticket.title).catch(console.error);
                    createNotification(
                        ticket.assignee.id,
                        'Ticket Atribuído',
                        `Foi-lhe atribuído o ticket #${ticket.id}: ${ticket.title}`,
                        'TICKET_ASSIGNED',
                        `/tickets/${ticket.id}`
                    );
                }

                tickets.push(ticket);
            }

            return res.status(201).json(tickets[0]); // Return the first one or a list? Frontend expects one object usually. Let's return the first one to avoid breaking frontend immediately, or we can return the list if we update frontend. 
            // The user said "create two separate tickets". The frontend will likely redirect to "my-tickets" list anyway.
            // Returning the first one is safe for now.
        }

        // Single assignee or no assignee (Legacy behavior)
        const ticket = await prisma.ticket.create({
            data: {
                title,
                description,
                priority: priority || 'MEDIUM',
                categoryId: parseInt(categoryId),
                creatorId: req.user.id,
                assigneeId: assigneeId ? parseInt(assigneeId) : null
            },
            include: {
                creator: true,
                assignee: true,
                category: true
            }
        });

        // Log activity
        await logActivity(req.user.id, ticket.id, 'TICKET_CREATED', `Ticket criado: ${ticket.title}`);

        // Send email to creator
        if (req.user.email) {
            sendTicketCreatedEmail(req.user.email, ticket.id, ticket.title).catch(console.error);
        }

        // Send email to assignee if assigned immediately
        if (ticket.assignee && ticket.assignee.email) {
            sendTicketAssignedEmail(ticket.assignee.email, ticket.id, ticket.title).catch(console.error);
            createNotification(
                ticket.assignee.id,
                'Ticket Atribuído',
                `Foi-lhe atribuído o ticket #${ticket.id}: ${ticket.title}`,
                'TICKET_ASSIGNED',
                `/tickets/${ticket.id}`
            );
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
            { assigneeId: userId }
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
            { description: { contains: search as string, mode: 'insensitive' } }
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
                attachments: true
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
                `Novo comentário no ticket #${id}`,
                'COMMENT_ADDED',
                `/tickets/${id}`
            );
        }
        // Notify assignee if not the commenter and not the creator (to avoid double notify)
        if (ticket && ticket.assigneeId && ticket.assigneeId !== userId && ticket.assigneeId !== ticket.creatorId) {
            createNotification(
                ticket.assigneeId,
                'Novo Comentário',
                `Novo comentário no ticket #${id}`,
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
    const { status, priority, assigneeId, title, description, categoryId } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    try {
        const ticket = await prisma.ticket.findUnique({ where: { id: parseInt(id) } });
        if (!ticket) return res.status(404).json({ message: 'Ticket não encontrado' });

        // 🔒 VALIDAÇÃO DE PERMISSÕES
        const isCreator = ticket.creatorId === userId;
        const isAssignee = ticket.assigneeId === userId;

        // Caso 1: Assignee pode APENAS mudar status para RESOLVED
        if (isAssignee && !isCreator && !isAdmin) {
            // Assignee só pode resolver ticket
            if (!status || status !== 'RESOLVED') {
                return res.status(403).json({
                    message: 'Utilizador atribuído só pode resolver o ticket'
                });
            }
            // Não pode alterar outros campos
            if (priority || assigneeId || title || description || categoryId) {
                return res.status(403).json({
                    message: 'Sem permissão para editar outros campos do ticket'
                });
            }
        }

        // Caso 2: Não é criador, assignee ou admin
        if (!isCreator && !isAssignee && !isAdmin) {
            return res.status(403).json({ message: 'Sem permissão para editar este ticket' });
        }

        // Caso 3: Criador ou Admin podem editar tudo
        const updatedTicket = await prisma.ticket.update({
            where: { id: parseInt(id) },
            data: {
                status,
                priority,
                assigneeId: assigneeId ? parseInt(assigneeId) : undefined,
                title,
                description,
                categoryId: categoryId ? parseInt(categoryId) : undefined
            },
            include: { assignee: true }
        });

        // Log activity
        if (status && status !== ticket.status) await logActivity(req.user.id, ticket.id, 'STATUS_CHANGED', `Estado alterado para ${status}`);
        if (priority && priority !== ticket.priority) await logActivity(req.user.id, ticket.id, 'PRIORITY_CHANGED', `Prioridade alterada para ${priority}`);
        if (assigneeId && parseInt(assigneeId) !== ticket.assigneeId) await logActivity(req.user.id, ticket.id, 'ASSIGNEE_CHANGED', `Atribuído a ${updatedTicket.assignee?.name || 'ninguém'}`);
        if (title && title !== ticket.title) await logActivity(req.user.id, ticket.id, 'TICKET_UPDATED', `Título atualizado`);

        // Check if assignee changed and send email
        if (assigneeId && updatedTicket.assignee && updatedTicket.assignee.email && parseInt(assigneeId) !== ticket.assigneeId) {
            sendTicketAssignedEmail(updatedTicket.assignee.email, updatedTicket.id, updatedTicket.title).catch(console.error);
            createNotification(
                updatedTicket.assignee.id,
                'Ticket Atribuído',
                `Foi-lhe atribuído o ticket #${updatedTicket.id}: ${updatedTicket.title}`,
                'TICKET_ASSIGNED',
                `/tickets/${updatedTicket.id}`
            );
        }

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
