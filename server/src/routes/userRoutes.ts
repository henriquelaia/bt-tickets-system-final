import { Router } from 'express';
import { getUsers, createUser, deleteUser, updateProfile, uploadAvatar } from '../controllers/userController';
import { authenticateToken, authorizeRole } from '../middleware/auth';
import upload from '../middleware/upload';

const router = Router();

router.get('/', authenticateToken, getUsers);
router.post('/', authenticateToken, authorizeRole(['ADMIN']), createUser);
router.delete('/:id', authenticateToken, authorizeRole(['ADMIN']), deleteUser);

router.patch('/profile', authenticateToken, updateProfile);
router.post('/profile/avatar', authenticateToken, upload.single('avatar'), uploadAvatar);

export default router;
