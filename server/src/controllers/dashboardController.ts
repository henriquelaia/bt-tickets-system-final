import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { Status } from '@prisma/client';

import { AuthenticatedRequest } from '../types';

export const getStats = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    try {
        // 🚀 OTIMIZAÇÃO: Executar todas as queries em paralelo com Promise.all
        // Em vez de ~12 queries sequenciais, fazemos tudo em paralelo

        const [
            // Estatísticas do utilizador - usando groupBy para menos queries
            userAssignedStats,
            userCreatedStats,
            recentActivity,
            // Estatísticas globais
            globalStats
        ] = await Promise.all([
            // Query agregada para tickets atribuídos ao utilizador
            prisma.ticket.groupBy({
                by: ['status'],
                where: { assigneeId: userId },
                _count: { status: true }
            }),
            // Query agregada para tickets criados pelo utilizador
            prisma.ticket.groupBy({
                by: ['status'],
                where: { creatorId: userId },
                _count: { status: true }
            }),
            // Atividade recente (limite de 10)
            prisma.activity.findMany({
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
            }),
            // Estatísticas globais usando groupBy
            prisma.ticket.groupBy({
                by: ['status'],
                _count: { status: true }
            })
        ]);

        // Processar estatísticas de tickets atribuídos
        const assignedOpen = userAssignedStats.find(s => s.status === Status.OPEN)?._count.status || 0;
        const assignedInProgress = userAssignedStats.find(s => s.status === Status.IN_PROGRESS)?._count.status || 0;
        const totalAssigned = userAssignedStats.reduce((acc, s) => acc + s._count.status, 0);

        // Processar estatísticas de tickets criados
        const createdOpen = userCreatedStats.find(s => s.status === Status.OPEN)?._count.status || 0;
        const createdClosed = userCreatedStats
            .filter(s => s.status === Status.RESOLVED || s.status === Status.CLOSED)
            .reduce((acc, s) => acc + s._count.status, 0);
        const totalCreated = userCreatedStats.reduce((acc, s) => acc + s._count.status, 0);

        // Processar estatísticas globais
        const total = globalStats.reduce((acc, s) => acc + s._count.status, 0);
        const open = globalStats.find(s => s.status === Status.OPEN)?._count.status || 0;
        const pending = globalStats.find(s => s.status === Status.IN_PROGRESS)?._count.status || 0;

        // Admin stats (apenas se for admin)
        let adminStats = {};
        if (isAdmin) {
            const [ticketsByCategory, ticketsByPriority] = await Promise.all([
                prisma.ticket.groupBy({
                    by: ['categoryId'],
                    _count: { categoryId: true }
                }),
                prisma.ticket.groupBy({
                    by: ['priority'],
                    _count: { priority: true }
                })
            ]);

            adminStats = {
                totalTickets: total,
                ticketsByStatus: globalStats,
                ticketsByCategory,
                ticketsByPriority
            };
        }

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
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: 'Erro ao carregar estatísticas' });
    }
};
