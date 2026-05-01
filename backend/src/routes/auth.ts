import { Router } from 'express';
import { register, login, googleAuth, me } from '../controllers/authController';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', requireAuth, (req, res) => me(req as any, res));

export default router;
