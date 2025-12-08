import express, { Router } from 'express';
import { getStats } from '../controllers/dashboardController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/stats', authenticateToken, (getStats as unknown) as express.RequestHandler);

export default router;
