import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Server } from 'http';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from './services/tokenService';
import { connect, disconnect, notifyPartner } from './presence';

const prisma = new PrismaClient();

export function attachWS(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const token = new URL(req.url!, 'ws://x').searchParams.get('token');
    let userId: string;
    try {
      const payload = verifyToken(token!);
      userId = payload.sub;
    } catch {
      ws.close(1008, 'Unauthorized');
      return;
    }

    connect(userId, ws);
    const partner = await getPartner(userId);
    if (partner) notifyPartner(partner.id, true);

    ws.on('close', async () => {
      disconnect(userId);
      const p = await getPartner(userId);
      if (p) notifyPartner(p.id, false);
    });
  });
}

async function getPartner(userId: string) {
  const conn = await prisma.connection.findFirst({
    where: { OR: [{ userAId: userId }, { userBId: userId }], cancelledAt: null },
    include: { userA: true, userB: true },
  });
  if (!conn) return null;
  return conn.userAId === userId ? conn.userB : conn.userA;
}
