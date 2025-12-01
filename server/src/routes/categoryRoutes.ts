import { Router } from 'express';
import { getCategories, createCategory, deleteCategory } from '../controllers/categoryController';
import { authenticateToken, authorizeRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getCategories);
router.post('/', authenticateToken, authorizeRole(['ADMIN']), createCategory);
router.delete('/:id', authenticateToken, authorizeRole(['ADMIN']), deleteCategory);

export default router;
