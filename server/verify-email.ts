import { sendTicketCreatedEmail } from './src/utils/emailService';

async function main() {
    console.log('Testing email service...');
    try {
        await sendTicketCreatedEmail('test@example.com', 999, 'Test Ticket from Script');
        console.log('Email test completed.');
    } catch (error) {
        console.error('Email test failed:', error);
    }
}

main();
