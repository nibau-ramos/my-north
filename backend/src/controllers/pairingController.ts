import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/requireAuth';
import { isOnline } from '../presence';

const prisma = new PrismaClient();

const now = () => new Date();

export async function getStatus(req: AuthRequest, res: Response) {
  const userId = req.user!.sub;
  const myEmail = req.user!.email;

  const activeConnection = await prisma.connection.findFirst({
    where: { OR: [{ userAId: userId }, { userBId: userId }], cancelledAt: null },
    include: { userA: true, userB: true },
  });

  if (activeConnection) {
    const partner = activeConnection.userAId === userId ? activeConnection.userB : activeConnection.userA;
    return res.json({ status: 'linked', partnerEmail: partner.email, linkedSince: activeConnection.acceptedAt, partnerOnline: isOnline(partner.id) });
  }

  // Incoming invite takes priority over outgoing — it requires a response
  const incomingInvite = await prisma.invite.findFirst({
    where: { toEmail: myEmail.toLowerCase(), status: 'pending', expiresAt: { gt: now() } },
    include: { fromUser: true },
  });

  if (incomingInvite) {
    return res.json({ status: 'invited', fromEmail: incomingInvite.fromUser.email });
  }

  const outgoingInvite = await prisma.invite.findFirst({
    where: { fromUserId: userId, status: 'pending', expiresAt: { gt: now() } },
  });

  if (outgoingInvite) {
    return res.json({ status: 'pending', invitedEmail: outgoingInvite.toEmail, expiresAt: outgoingInvite.expiresAt });
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

  // Supersede any existing pending invite from this user
  await prisma.invite.updateMany({
    where: { fromUserId: userId, status: 'pending' },
    data: { status: 'superseded', resolvedAt: now() },
  });

  const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  const newInvite = await prisma.invite.create({ data: { fromUserId: userId, toEmail: targetEmail, expiresAt } });

  const mutual = await prisma.invite.findFirst({
    where: { toEmail: myEmail.toLowerCase(), status: 'pending', expiresAt: { gt: now() } },
    include: { fromUser: true },
  });

  if (mutual && mutual.fromUser.email.toLowerCase() === targetEmail) {
    const inviterUserId = mutual.fromUserId;
    const invitedUserId = userId;

    await prisma.connection.deleteMany({
      where: {
        OR: [
          { userAId: inviterUserId, userBId: invitedUserId },
          { userAId: invitedUserId, userBId: inviterUserId },
        ],
      },
    });

    await prisma.connection.create({ data: { userAId: inviterUserId, userBId: invitedUserId, acceptedAt: now() } });

    // Mark both invites as accepted
    await prisma.invite.update({ where: { id: mutual.id }, data: { status: 'accepted', resolvedAt: now() } });
    await prisma.invite.update({ where: { id: newInvite.id }, data: { status: 'accepted', resolvedAt: now() } });

    return res.json({ status: 'linked', partnerEmail: targetEmail });
  }

  return res.json({ status: 'pending', invitedEmail: targetEmail, expiresAt });
}

export async function acceptInvite(req: AuthRequest, res: Response) {
  const userId = req.user!.sub;
  const myEmail = req.user!.email;

  const invite = await prisma.invite.findFirst({
    where: { toEmail: myEmail.toLowerCase(), status: 'pending', expiresAt: { gt: now() } },
    include: { fromUser: true },
  });

  if (!invite) return res.status(404).json({ error: 'No pending invite found' });

  const inviterUserId = invite.fromUserId;
  const invitedUserId = userId;

  await prisma.connection.deleteMany({
    where: {
      OR: [
        { userAId: inviterUserId, userBId: invitedUserId },
        { userAId: invitedUserId, userBId: inviterUserId },
      ],
    },
  });

  await prisma.connection.create({ data: { userAId: inviterUserId, userBId: invitedUserId, acceptedAt: now() } });

  await prisma.invite.update({ where: { id: invite.id }, data: { status: 'accepted', resolvedAt: now() } });
  // Supersede any pending outgoing invite from the accepter
  await prisma.invite.updateMany({
    where: { fromUserId: userId, status: 'pending' },
    data: { status: 'superseded', resolvedAt: now() },
  });

  return res.json({ status: 'linked', partnerEmail: invite.fromUser.email });
}

export async function rejectInvite(req: AuthRequest, res: Response) {
  const userId = req.user!.sub;
  const myEmail = req.user!.email;

  await prisma.invite.updateMany({
    where: { toEmail: myEmail.toLowerCase(), status: 'pending' },
    data: { status: 'rejected', resolvedAt: now() },
  });

  const brokenConnection = await prisma.connection.findFirst({
    where: { OR: [{ userAId: userId }, { userBId: userId }], cancelledAt: { not: null } },
  });

  return res.json({ status: brokenConnection ? 'broken' : 'free' });
}

export async function cancelInvite(req: AuthRequest, res: Response) {
  const userId = req.user!.sub;

  await prisma.invite.updateMany({
    where: { fromUserId: userId, status: 'pending' },
    data: { status: 'cancelled', resolvedAt: now() },
  });

  const brokenConnection = await prisma.connection.findFirst({
    where: { OR: [{ userAId: userId }, { userBId: userId }], cancelledAt: { not: null } },
  });

  return res.json({ status: brokenConnection ? 'broken' : 'free' });
}

export async function breakLink(req: AuthRequest, res: Response) {
  const userId = req.user!.sub;

  await prisma.connection.updateMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }], cancelledAt: null },
    data: { cancelledAt: now() },
  });

  return res.json({ status: 'broken' });
}
