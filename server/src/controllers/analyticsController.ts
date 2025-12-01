import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getStats = async (req: Request, res: Response) => {
    try {
        const total = await prisma.ticket.count();
        const open = await prisma.ticket.count({ where: { status: 'OPEN' } });
        const closed = await prisma.ticket.count({ where: { status: 'CLOSED' } });
        const inProgress = await prisma.ticket.count({ where: { status: 'IN_PROGRESS' } });

        // Calculate average resolution time
        const resolvedTickets = await prisma.ticket.findMany({
            where: {
                status: {
                    in: ['CLOSED', 'RESOLVED']
                }
            },
            select: {
                createdAt: true,
                updatedAt: true
            }
        });

        let totalTime = 0;
        resolvedTickets.forEach(ticket => {
            totalTime += new Date(ticket.updatedAt).getTime() - new Date(ticket.createdAt).getTime();
        });

        const averageTimeMs = resolvedTickets.length > 0 ? totalTime / resolvedTickets.length : 0;

        const formatDuration = (ms: number) => {
            if (ms === 0) return 'N/A';
            const hours = Math.floor(ms / (1000 * 60 * 60));
            const days = Math.floor(hours / 24);
            const remainingHours = hours % 24;

            if (days > 0) return `${days}d ${remainingHours}h`;
            return `${hours}h`;
        };

        res.json({
            total,
            open,
            closed,
            inProgress,
            resolved: await prisma.ticket.count({ where: { status: 'RESOLVED' } }),
            averageResolutionTime: formatDuration(averageTimeMs)
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar estatísticas' });
    }
};

export const getTrends = async (req: Request, res: Response) => {
    try {
        // Get last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const tickets = await prisma.ticket.findMany({
            where: {
                createdAt: {
                    gte: sevenDaysAgo
                }
            },
            select: {
                createdAt: true,
                status: true
            }
        });

        // Group by date
        const trends: Record<string, number> = {};
        // Initialize last 7 days with 0
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            trends[d.toLocaleDateString()] = 0;
        }

        tickets.forEach(t => {
            const date = new Date(t.createdAt).toLocaleDateString();
            if (trends[date] !== undefined) {
                trends[date]++;
            }
        });

        const formattedTrends = Object.entries(trends)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        res.json(formattedTrends);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar tendências' });
    }
};

export const getPriorityDistribution = async (req: Request, res: Response) => {
    try {
        const distribution = await prisma.ticket.groupBy({
            by: ['priority'],
            _count: {
                priority: true
            }
        });

        const formatted = distribution.map(item => ({
            name: item.priority,
            value: item._count.priority
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar distribuição de prioridade' });
    }
};

export const getCategoryDistribution = async (req: Request, res: Response) => {
    try {
        const distribution = await prisma.ticket.groupBy({
            by: ['categoryId'],
            _count: {
                categoryId: true
            }
        });

        // Fetch category names
        const categories = await prisma.category.findMany({
            where: {
                id: {
                    in: distribution.map(d => d.categoryId)
                }
            }
        });

        const formatted = distribution.map(item => {
            const category = categories.find(c => c.id === item.categoryId);
            return {
                name: category?.name || 'Unknown',
                value: item._count.categoryId
            };
        });

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar distribuição de categoria' });
    }
};
