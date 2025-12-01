import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { Status, Priority } from '@prisma/client';
import { sendTicketCreatedEmail, sendTicketAssignedEmail } from '../utils/emailService';
import { getIO } from '../utils/socket';
import { logActivity } from '../utils/activityLogger';
import { createNotification } from '../utils/notification';

import { AuthenticatedRequest } from '../types';

export const createTicket = async (req: AuthenticatedRequest, res: Response) => {
    const { title, description, priority, categoryId, assigneeId } = req.body;
    const creatorId = req.user.id;

    try {
        const ticket = await prisma.ticket.create({
            data: {
                title,
                description,
                priority: priority || 'MEDIUM',
                categoryId: categoryId,
                creatorId: req.user.id,
                assigneeId: assigneeId || null
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
        res.status(500).json({ message: 'Erro ao criar ticket' });
    }
};

export const getTickets = async (req: AuthenticatedRequest, res: Response) => {
    const { status, priority, category, assignedToMe, createdByMe, search, startDate, endDate, page = 1, limit = 10 } = req.query;
    const userId = req.user.id;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = { name: category }; // Assuming category name is passed, or adjust if ID

    if (assignedToMe === 'true') where.assigneeId = userId;
    if (createdByMe === 'true') where.creatorId = userId;

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
                    include: { user: { select: { id: true, name: true } } },
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
    const { status, priority, assigneeId } = req.body;

    try {
        const ticket = await prisma.ticket.update({
            where: { id: parseInt(id) },
            data: { status, priority, assigneeId },
            include: { assignee: true }
        });

        // Log activity
        if (status) await logActivity(req.user.id, ticket.id, 'STATUS_CHANGED', `Estado alterado para ${status}`);
        if (priority) await logActivity(req.user.id, ticket.id, 'PRIORITY_CHANGED', `Prioridade alterada para ${priority}`);
        if (assigneeId) await logActivity(req.user.id, ticket.id, 'ASSIGNEE_CHANGED', `Atribuído a ${ticket.assignee?.name || 'ninguém'}`);

        // Check if assignee changed and send email
        if (assigneeId && ticket.assignee && ticket.assignee.email) {
            // Ideally check if assigneeId actually changed, but for now send on any update with assignee
            sendTicketAssignedEmail(ticket.assignee.email, ticket.id, ticket.title).catch(console.error);
            createNotification(
                ticket.assignee.id,
                'Ticket Atribuído',
                `Foi-lhe atribuído o ticket #${ticket.id}: ${ticket.title}`,
                'TICKET_ASSIGNED',
                `/tickets/${ticket.id}`
            );
        }

        // Emit socket event
        getIO().emit('ticket:updated', ticket);

        res.json(ticket);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar ticket' });
    }
};

export const uploadAttachment = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!req.file) {
        return res.status(400).json({ message: 'Nenhum ficheiro carregado' });
    }

    try {
        const attachment = await prisma.attachment.create({
            data: {
                url: `/uploads/${req.file.filename}`,
                name: req.file.originalname,
                ticketId: parseInt(id)
            }
        });
        res.status(201).json(attachment);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao carregar ficheiro' });
    }
};
