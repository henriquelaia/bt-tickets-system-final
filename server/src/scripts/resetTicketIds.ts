import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetTicketIds() {
    try {
        console.log('🔄 A resetar IDs dos tickets...');

        // 1. Apagar todos os tickets (e dados relacionados por cascade)
        await prisma.ticket.deleteMany({});
        console.log('✅ Todos os tickets apagados');

        // 2. Resetar a sequência do auto-increment para 1
        await prisma.$executeRaw`ALTER SEQUENCE "Ticket_id_seq" RESTART WITH 1;`;
        console.log('✅ Sequência de IDs resetada para 1');

        // Também resetar outras tabelas relacionadas se necessário
        await prisma.comment.deleteMany({});
        await prisma.attachment.deleteMany({});
        await prisma.activity.deleteMany({});
        await prisma.notification.deleteMany({});

        await prisma.$executeRaw`ALTER SEQUENCE "Comment_id_seq" RESTART WITH 1;`;
        await prisma.$executeRaw`ALTER SEQUENCE "Attachment_id_seq" RESTART WITH 1;`;
        await prisma.$executeRaw`ALTER SEQUENCE "Activity_id_seq" RESTART WITH 1;`;
        await prisma.$executeRaw`ALTER SEQUENCE "Notification_id_seq" RESTART WITH 1;`;

        console.log('✅ Todas as sequências resetadas');
        console.log('');
        console.log('🎉 Pronto! Os próximos tickets começarão do #1');

    } catch (error) {
        console.error('❌ Erro ao resetar IDs:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Executar
resetTicketIds();
