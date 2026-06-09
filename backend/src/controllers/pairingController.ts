import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/requireAuth';

const prisma = new PrismaClient();

export async function getStatus(req: AuthRequest, res: Response) {
  const userId = req.user!.sub;
  const myEmail = req.user!.email;

  const activeConnection = await prisma.connection.findFirst({
    where: { OR: [{ userAId: userId }, { userBId: userId }], cancelledAt: null },
    include: { userA: true, userB: true },
  });

  if (activeConnection) {
    const partner = activeConnection.userAId === userId ? activeConnection.userB : activeConnection.userA;
    return res.json({ status: 'linked', partnerEmail: partner.email });
  }

  const invite = await prisma.invite.findFirst({
    where: { fromUserId: userId, expiresAt: { gt: new Date() } },
  });

  if (invite) {
    return res.json({ status: 'pending', invitedEmail: invite.toEmail, expiresAt: invite.expiresAt });
  }

  const brokenConnection = await prisma.connection.findFirst({
    where: { OR: [{ userAId: userId }, { userBId: userId }], cancelledAt: { not: null } },
  });

  if (brokenConnection) {
    return res.json({ status: 'broken' });
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
    where: { OR: [{ userAId: userId }, { userBId: userId }], cancelledAt: null },
  });
  if (existing) return res.status(400).json({ error: 'already linked' });

  await prisma.invite.deleteMany({ where: { fromUserId: userId } });

  const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  await prisma.invite.create({ data: { fromUserId: userId, toEmail: targetEmail, expiresAt } });

  const mutual = await prisma.invite.findFirst({
    where: { toEmail: myEmail.toLowerCase(), expiresAt: { gt: new Date() } },
    include: { fromUser: true },
  });

  if (mutual && mutual.fromUser.email.toLowerCase() === targetEmail) {
    const [a, b] = [userId, mutual.fromUserId].sort();

    // Remove any previous cancelled connection between this pair before creating a new one
    await prisma.connection.deleteMany({ where: { userAId: a, userBId: b } });

    await prisma.connection.create({ data: { userAId: a, userBId: b, acceptedAt: new Date() } });
    await prisma.invite.deleteMany({ where: { id: mutual.id } });
    await prisma.invite.deleteMany({ where: { fromUserId: userId } });
    return res.json({ status: 'linked', partnerEmail: targetEmail });
  }

  return res.json({ status: 'pending', invitedEmail: targetEmail, expiresAt });
}

export async function cancelInvite(req: AuthRequest, res: Response) {
  const userId = req.user!.sub;
  await prisma.invite.deleteMany({ where: { fromUserId: userId } });

  const brokenConnection = await prisma.connection.findFirst({
    where: { OR: [{ userAId: userId }, { userBId: userId }], cancelledAt: { not: null } },
  });

  return res.json({ status: brokenConnection ? 'broken' : 'free' });
}

export async function breakLink(req: AuthRequest, res: Response) {
  const userId = req.user!.sub;

  await prisma.connection.updateMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }], cancelledAt: null },
    data: { cancelledAt: new Date() },
  });

  return res.json({ status: 'broken' });
}
