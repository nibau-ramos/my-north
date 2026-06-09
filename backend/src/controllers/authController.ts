import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { hashPassword, comparePassword } from '../services/passwordService';
import { signToken } from '../services/tokenService';
import { verifyGoogleToken } from '../services/googleService';
import { AuthRequest } from '../middleware/requireAuth';

const prisma = new PrismaClient();

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getProvider(user: { googleId: string | null }): 'google' | 'email' {
  return user.googleId ? 'google' : 'email';
}

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }
  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Invalid email format' });
    return;
  }
  if (typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already in use' });
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { email, passwordHash } });
  const token = signToken({ sub: user.id, email: user.email });

  res.status(201).json({ token, user: { id: user.id, email: user.email, provider: getProvider(user) } });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = signToken({ sub: user.id, email: user.email });
  res.json({ token, user: { id: user.id, email: user.email, provider: getProvider(user) } });
}

export async function googleAuth(req: Request, res: Response): Promise<void> {
  const { idToken } = req.body;

  if (!idToken) {
    res.status(400).json({ error: 'idToken is required' });
    return;
  }

  const { googleId, email } = await verifyGoogleToken(idToken);

  const user = await prisma.user.upsert({
    where: { googleId },
    update: {},
    create: { email, googleId },
  });

  const token = signToken({ sub: user.id, email: user.email });
  res.json({ token, user: { id: user.id, email: user.email, provider: getProvider(user) } });
}

export async function me(req: AuthRequest, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user: { id: user.id, email: user.email, provider: getProvider(user) } });
}

export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'currentPassword and newPassword are required' });
    return;
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    res.status(400).json({ error: 'New password must be at least 8 characters' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.passwordHash) {
    res.status(400).json({ error: 'Password change is not available for this account type' });
    return;
  }

  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Current password is incorrect' });
    return;
  }

  const newHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });

  res.json({ success: true });
}

export async function deleteAccount(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.sub;

  await prisma.invite.deleteMany({ where: { fromUserId: userId } });
  await prisma.connection.deleteMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
  });
  await prisma.user.delete({ where: { id: userId } });

  res.json({ success: true });
}
