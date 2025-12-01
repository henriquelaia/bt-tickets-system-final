import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter;

const createTransporter = async () => {
    if (transporter) return transporter;

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        console.log('Using Real SMTP Server');
    } else {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
        console.log('Using Ethereal Test Email');
    }

    return transporter;
};

export const sendTicketCreatedEmail = async (to: string, ticketId: number, title: string) => {
    const transporter = await createTransporter();
    const info = await transporter.sendMail({
        from: '"Ticket System" <system@example.com>',
        to,
        subject: `Novo Ticket Criado: #${ticketId}`,
        text: `Um novo ticket foi criado: ${title}`,
        html: `<p>Um novo ticket foi criado: <b>${title}</b></p><p>ID: #${ticketId}</p>`
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
};

export const sendTicketAssignedEmail = async (to: string, ticketId: number, title: string) => {
    const transporter = await createTransporter();
    const info = await transporter.sendMail({
        from: '"Ticket System" <system@example.com>',
        to,
        subject: `Ticket Atribuído: #${ticketId}`,
        text: `Foi-lhe atribuído o ticket #${ticketId}: ${title}`,
        html: `<p>Foi-lhe atribuído o ticket <b>#${ticketId}</b>: ${title}</p>`
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
};
