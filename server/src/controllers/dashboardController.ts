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

        // Get activity relevant to this user only (tickets they created, tickets assigned to them, or their actions)
        const recentActivity = await prisma.activity.findMany({
            where: {
                OR: [
                    { ticket: { creatorId: userId } },
                    { ticket: { assigneeId: userId } },
                    { userId: userId }
                ]
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { name: true, avatarUrl: true } },
                ticket: { select: { id: true, title: true } }
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

        // Calculate totals for easier frontend consumption
        const totalAssigned = assignedOpen + assignedInProgress;
        const totalCreated = createdOpen + createdClosed;

        // For backwards compatibility, also include legacy fields
        const total = await prisma.ticket.count();
        const open = await prisma.ticket.count({ where: { status: Status.OPEN } });
        const pending = await prisma.ticket.count({ where: { status: Status.IN_PROGRESS } });

        res.json({
            // Legacy fields for existing dashboard cards
            total,
            open,
            pending,
            recentActivity,
            // New user-specific statistics
            assigned: {
                open: assignedOpen,
                inProgress: assignedInProgress,
                total: totalAssigned
            },
            created: {
                open: createdOpen,
                closed: createdClosed,
                total: totalCreated
            },
            ...adminStats
        });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao carregar estatísticas' });
    }
};
