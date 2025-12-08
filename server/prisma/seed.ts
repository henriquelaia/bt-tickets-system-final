import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const adminEmail = 'admin@example.com';
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (!existingAdmin) {
        const adminPassword = await bcrypt.hash('admin123', 10);

        const admin = await prisma.user.upsert({
            where: { email: 'admin@example.com' },
            update: {},
            create: {
                email: 'admin@example.com',
                name: 'Admin User',
                password: adminPassword,
                role: 'ADMIN'
            }
        });

        const categories = ['WORTEN', 'SERVITIS', 'INSTALACAO', 'MANUTENCAO', 'REPARACAO', 'OUTRO'];

        for (const cat of categories) {
            await prisma.category.upsert({
                where: { name: cat },
                update: {},
                create: { name: cat }
            });
        }

        console.log({ admin });
        console.log('Admin user created');
    } else {
        console.log('Admin user already exists');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
