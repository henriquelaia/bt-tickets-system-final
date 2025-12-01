import express, { Router } from 'express';
import { createTicket, getTickets, getTicket, addComment, updateTicket, uploadAttachment } from '../controllers/ticketController';
import upload from '../middleware/upload';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/', (createTicket as unknown) as express.RequestHandler);
router.get('/', (getTickets as unknown) as express.RequestHandler);
router.get('/:id', (getTicket as unknown) as express.RequestHandler);
router.patch('/:id', authenticateToken, (updateTicket as unknown) as express.RequestHandler);
router.post('/:id/attachments', authenticateToken, upload.single('file'), (uploadAttachment as unknown) as express.RequestHandler);
router.post('/:id/comments', (addComment as unknown) as express.RequestHandler);

export default router;
