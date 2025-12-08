import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const logActivity = async (userId: number, ticketId: number | null, action: string, details: string) => {
    try {
        await prisma.activity.create({
            data: {
                userId,
                ticketId,
                action,
                details
            }
        });
    } catch (error) {
        console.error('Error logging activity:', error);
    }
};
