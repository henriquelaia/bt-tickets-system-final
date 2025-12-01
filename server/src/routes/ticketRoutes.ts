import { Router } from 'express';
import { createTicket, getTickets, getTicket, addComment, updateTicket, uploadAttachment } from '../controllers/ticketController';
import upload from '../middleware/upload';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/', createTicket);
router.get('/', getTickets);
router.get('/:id', getTicket);
router.patch('/:id', authenticateToken, updateTicket);
router.post('/:id/attachments', authenticateToken, upload.single('file'), uploadAttachment);
router.post('/:id/comments', addComment);

export default router;
