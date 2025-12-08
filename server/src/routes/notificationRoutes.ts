import express, { Router } from 'express';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', (getNotifications as unknown) as express.RequestHandler);
router.patch('/:id/read', (markAsRead as unknown) as express.RequestHandler);
router.patch('/read-all', (markAllAsRead as unknown) as express.RequestHandler);

export default router;
