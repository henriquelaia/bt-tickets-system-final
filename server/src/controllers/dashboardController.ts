import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { Status } from '@prisma/client';

import { AuthenticatedRequest } from '../types';

export const getStats = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    try {
        const assignedOpen = await prisma.ticket.count({
            where: { assigneeId: userId, status: Status.OPEN }
        });
        const assignedInProgress = await prisma.ticket.count({
            where: { assigneeId: userId, status: Status.IN_PROGRESS }
        });

        const resolved = await prisma.ticket.count({ where: { status: Status.RESOLVED } });
        const recentActivity = await prisma.activity.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { name: true, avatarUrl: true } }
            }
        });

        const createdOpen = await prisma.ticket.count({
            where: { creatorId: userId, status: Status.OPEN }
        });
        const createdClosed = await prisma.ticket.count({
            where: { creatorId: userId, status: { in: [Status.RESOLVED, Status.CLOSED] } }
        });

        let adminStats = {};
        if (isAdmin) {
            const totalTickets = await prisma.ticket.count();
            const ticketsByStatus = await prisma.ticket.groupBy({
                by: ['status'],
                _count: { status: true }
            });
            const ticketsByCategory = await prisma.ticket.groupBy({
                by: ['categoryId'],
                _count: { categoryId: true }
            });
            const ticketsByPriority = await prisma.ticket.groupBy({
                by: ['priority'],
                _count: { priority: true }
            });

            adminStats = {
                totalTickets,
                ticketsByStatus,
                ticketsByCategory,
                ticketsByPriority
            };
        }

        res.json({
            assigned: {
                open: assignedOpen,
                inProgress: assignedInProgress
            },
            created: {
                open: createdOpen,
                closed: createdClosed
            },
            ...adminStats
        });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao carregar estatísticas' });
    }
};
