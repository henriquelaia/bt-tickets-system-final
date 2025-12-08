import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import prisma from '../utils/prisma';

export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar notificações' });
    }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.notification.update({
            where: { id: parseInt(id), userId: req.user.id },
            data: { read: true }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao marcar notificação como lida' });
    }
};

export const markAllAsRead = async (req: AuthenticatedRequest, res: Response) => {
    try {
        await prisma.notification.updateMany({
            where: { userId: req.user.id, read: false },
            data: { read: true }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao marcar todas como lidas' });
    }
};
