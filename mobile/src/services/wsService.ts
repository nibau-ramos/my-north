import { BASE_URL } from './api';

type PartnerStatusCallback = (online: boolean) => void;

let socket: WebSocket | null = null;
let onPartnerStatusCb: PartnerStatusCallback | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let activeToken: string | null = null;

export function connectWS(token: string): void {
  if (socket?.readyState === WebSocket.OPEN) return;
  activeToken = token;
  const url = BASE_URL.replace(/^http/, 'ws') + '/ws?token=' + token;
  socket = new WebSocket(url);

  socket.onmessage = (e: WebSocketMessageEvent) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === 'partner_status') onPartnerStatusCb?.(msg.online);
    } catch {}
  };

  socket.onclose = () => {
    socket = null;
    if (activeToken) {
      reconnectTimer = setTimeout(() => {
        if (activeToken) connectWS(activeToken);
      }, 3000);
    }
  };
}

export function disconnectWS(): void {
  activeToken = null;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  socket?.close();
  socket = null;
}

export function onPartnerStatus(cb: PartnerStatusCallback): void {
  onPartnerStatusCb = cb;
}
