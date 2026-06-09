import api from './api';

export type PairingStatus =
  | { status: 'free' }
  | { status: 'broken' }
  | { status: 'pending'; invitedEmail: string; expiresAt: string }
  | { status: 'linked'; partnerEmail: string };

export async function getStatus(): Promise<PairingStatus> {
  const { data } = await api.get('/pairing/status');
  return data;
}

export async function sendInvite(email: string): Promise<PairingStatus> {
  const { data } = await api.post('/pairing/invite', { email });
  return data;
}

export async function cancelInvite(): Promise<PairingStatus> {
  const { data } = await api.delete('/pairing/invite');
  return data;
}

export async function breakLink(): Promise<PairingStatus> {
  const { data } = await api.delete('/pairing/link');
  return data;
}
