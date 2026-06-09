import { WebSocket } from 'ws';

const connections = new Map<string, WebSocket>();

export function connect(userId: string, ws: WebSocket): void {
  connections.set(userId, ws);
}

export function disconnect(userId: string): void {
  connections.delete(userId);
}

export function isOnline(userId: string): boolean {
  return connections.has(userId);
}

export function notifyPartner(partnerId: string, online: boolean): void {
  const ws = connections.get(partnerId);
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'partner_status', online }));
  }
}
