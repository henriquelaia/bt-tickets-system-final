import prisma from './prisma';
import { getIO } from './socket';

export const createNotification = async (
    userId: number,
    title: string,
    message: string,
    type: string,
    link?: string
) => {
    try {
        const notification = await prisma.notification.create({
            data: {
                userId,
                title,
                message,
                type,
                link
            }
        });

        const io = getIO();
        io.to(`user:${userId}`).emit('notification', notification);

        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
    }
};
