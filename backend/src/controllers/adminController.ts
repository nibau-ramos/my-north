import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AdminRequest } from '../middleware/requireAdmin';

const prisma = new PrismaClient();

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  maxAge: 8 * 60 * 60 * 1000,
};

export async function login(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }
  const admin = await prisma.admin.findUnique({ where: { username } });
  if (!admin) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const token = jwt.sign({ sub: admin.id, role: 'admin' }, config.jwtSecret, { expiresIn: '8h' });
  res.cookie('adminToken', token, COOKIE_OPTS);
  res.json({ ok: true });
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie('adminToken');
  res.json({ ok: true });
}

export async function getUsers(_req: AdminRequest, res: Response): Promise<void> {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(users);
}

export async function getInvites(_req: AdminRequest, res: Response): Promise<void> {
  const invites = await prisma.invite.findMany({
    include: { fromUser: { select: { id: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const connections = await prisma.connection.findMany();
  const connectedUserIds = new Set(
    connections.flatMap(c => [c.userAId, c.userBId])
  );

  const now = new Date();
  const result = invites.map(inv => {
    let status: 'accepted' | 'expired' | 'pending';
    if (connectedUserIds.has(inv.fromUserId)) {
      status = 'accepted';
    } else if (inv.expiresAt < now) {
      status = 'expired';
    } else {
      status = 'pending';
    }
    return { ...inv, status };
  });

  res.json(result);
}

export async function getConnections(_req: AdminRequest, res: Response): Promise<void> {
  const connections = await prisma.connection.findMany({
    include: {
      userA: { select: { id: true, email: true } },
      userB: { select: { id: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(connections);
}

export async function getAdmins(_req: AdminRequest, res: Response): Promise<void> {
  const admins = await prisma.admin.findMany({
    select: { id: true, username: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json(admins);
}

export async function createAdmin(req: AdminRequest, res: Response): Promise<void> {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }
  const existing = await prisma.admin.findUnique({ where: { username } });
  if (existing) {
    res.status(409).json({ error: 'Username already taken' });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.admin.create({
    data: { username, passwordHash },
    select: { id: true, username: true, createdAt: true, updatedAt: true },
  });
  res.status(201).json(admin);
}

export async function updateAdmin(req: AdminRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { username, password } = req.body;
  if (!username && !password) {
    res.status(400).json({ error: 'Nothing to update' });
    return;
  }
  const data: { username?: string; passwordHash?: string } = {};
  if (username) data.username = username;
  if (password) data.passwordHash = await bcrypt.hash(password, 10);

  try {
    const admin = await prisma.admin.update({
      where: { id },
      data,
      select: { id: true, username: true, createdAt: true, updatedAt: true },
    });
    res.json(admin);
  } catch {
    res.status(404).json({ error: 'Admin not found' });
  }
}

export async function deleteAdmin(req: AdminRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const count = await prisma.admin.count();
  if (count <= 1) {
    res.status(400).json({ error: 'Cannot delete the last admin' });
    return;
  }
  try {
    await prisma.admin.delete({ where: { id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: 'Admin not found' });
  }
}
