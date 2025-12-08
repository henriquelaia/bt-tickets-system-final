import express from 'express';
import { getStats, getTrends, getPriorityDistribution, getCategoryDistribution } from '../controllers/analyticsController';
import { authenticateToken, authorizeRole } from '../middleware/auth';

const isAdmin = authorizeRole(['ADMIN']);

const router = express.Router();

// All analytics routes should be protected and likely admin-only
router.use(authenticateToken);
router.use(isAdmin);

router.get('/stats', getStats);
router.get('/trends', getTrends);
router.get('/distribution/priority', getPriorityDistribution);
router.get('/distribution/category', getCategoryDistribution);

export default router;
