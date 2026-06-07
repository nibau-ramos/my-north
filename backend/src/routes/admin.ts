import { Router, Request, Response } from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { requireAdmin } from '../middleware/requireAdmin';
import * as adminController from '../controllers/adminController';

const router = Router();

function isValidAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const p = jwt.verify(token, config.jwtSecret) as { role?: string };
    return p.role === 'admin';
  } catch {
    return false;
  }
}

// Pages
router.get('/', (req: Request, res: Response) => {
  if (isValidAdminToken(req.cookies?.adminToken)) {
    res.sendFile(path.resolve('public/admin/index.html'));
  } else {
    res.redirect('/admin/login');
  }
});

router.get('/login', (_req: Request, res: Response) => {
  res.sendFile(path.resolve('public/admin/login.html'));
});

// Auth API
router.post('/api/login', adminController.login);
router.post('/api/logout', adminController.logout);

// Protected API
router.get('/api/users', requireAdmin, adminController.getUsers);
router.get('/api/invites', requireAdmin, adminController.getInvites);
router.get('/api/connections', requireAdmin, adminController.getConnections);
router.get('/api/admins', requireAdmin, adminController.getAdmins);
router.post('/api/admins', requireAdmin, adminController.createAdmin);
router.put('/api/admins/:id', requireAdmin, adminController.updateAdmin);
router.delete('/api/admins/:id', requireAdmin, adminController.deleteAdmin);

export default router;
