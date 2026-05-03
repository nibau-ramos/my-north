import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/requireAuth';

const prisma = new PrismaClient();

export async function getStatus(req: AuthRequest, res: Response) {
  const userId = req.user!.sub;
  const myEmail = req.user!.email;

  const connection = await prisma.connection.findFirst({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    include: { userA: true, userB: true },
  });

  if (connection) {
    const partner = connection.userAId === userId ? connection.userB : connection.userA;
    return res.json({ status: 'linked', partnerEmail: partner.email });
  }

  const invite = await prisma.invite.findFirst({
    where: { fromUserId: userId, expiresAt: { gt: new Date() } },
  });

  if (invite) {
    return res.json({ status: 'pending', invitedEmail: invite.toEmail, expiresAt: invite.expiresAt });
  }

  return res.json({ status: 'free' });
}

export async function sendInvite(req: AuthRequest, res: Response) {
  const userId = req.user!.sub;
  const myEmail = req.user!.email;
  const targetEmail: string = req.body.email?.trim().toLowerCase();

  if (!targetEmail) return res.status(400).json({ error: 'email is required' });
  if (targetEmail === myEmail.toLowerCase()) {
    return res.status(400).json({ error: 'cannot invite yourself' });
  }

  const existing = await prisma.connection.findFirst({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
  });
  if (existing) return res.status(400).json({ error: 'already linked' });

  // Upsert invite (delete old one first)
  await prisma.invite.deleteMany({ where: { fromUserId: userId } });

  const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  await prisma.invite.create({ data: { fromUserId: userId, toEmail: targetEmail, expiresAt } });

  // Check for mutual invite
  const mutual = await prisma.invite.findFirst({
    where: { toEmail: myEmail.toLowerCase(), expiresAt: { gt: new Date() } },
    include: { fromUser: true },
  });

  if (mutual && mutual.fromUser.email.toLowerCase() === targetEmail) {
    // Create connection (ensure consistent ordering)
    const [a, b] = [userId, mutual.fromUserId].sort();
    await prisma.connection.create({ data: { userAId: a, userBId: b } });
    await prisma.invite.deleteMany({ where: { id: { in: [mutual.id] } } });
    await prisma.invite.deleteMany({ where: { fromUserId: userId } });
    return res.json({ status: 'linked', partnerEmail: targetEmail });
  }

  return res.json({ status: 'pending', invitedEmail: targetEmail, expiresAt });
}

export async function cancelInvite(req: AuthRequest, res: Response) {
  const userId = req.user!.sub;
  await prisma.invite.deleteMany({ where: { fromUserId: userId } });
  return res.json({ status: 'free' });
}

export async function breakLink(req: AuthRequest, res: Response) {
  const userId = req.user!.sub;
  await prisma.connection.deleteMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
  });
  return res.json({ status: 'free' });
}
