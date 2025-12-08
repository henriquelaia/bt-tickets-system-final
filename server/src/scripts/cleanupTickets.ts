import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting cleanup...');

    try {
        // Delete related data first
        console.log('Deleting attachments...');
        await prisma.attachment.deleteMany({});

        console.log('Deleting comments...');
        await prisma.comment.deleteMany({});

        console.log('Deleting ticket activities...');
        await prisma.activity.deleteMany({
            where: {
                ticketId: {
                    not: null
                }
            }
        });

        // Delete tickets
        console.log('Deleting tickets...');
        const { count } = await prisma.ticket.deleteMany({});

        console.log(`Cleanup complete. Deleted ${count} tickets.`);
    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
