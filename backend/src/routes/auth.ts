import { Router } from 'express';
import { register, login, googleAuth, me, changePassword, deleteAccount, heartbeat } from '../controllers/authController';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', requireAuth, (req, res) => me(req as any, res));
router.post('/change-password', requireAuth, (req, res) => changePassword(req as any, res));
router.post('/heartbeat', requireAuth, (req, res) => heartbeat(req as any, res));
router.delete('/account', requireAuth, (req, res) => deleteAccount(req as any, res));

export default router;
