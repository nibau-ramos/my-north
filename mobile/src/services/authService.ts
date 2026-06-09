import api, { setAuthToken } from './api';

export type UserProvider = 'google' | 'email';

interface AuthResponse {
  token: string;
  user: { id: string; email: string; provider: UserProvider };
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/register', { email, password });
  return res.data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/login', { email, password });
  return res.data;
}

export async function googleSignIn(idToken: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/google', { idToken });
  return res.data;
}

export async function getMe(token: string): Promise<{ user: { id: string; email: string; provider: UserProvider } }> {
  setAuthToken(token);
  const res = await api.get<{ user: { id: string; email: string; provider: UserProvider } }>('/auth/me');
  return res.data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.post('/auth/change-password', { currentPassword, newPassword });
}

export async function deleteAccount(): Promise<void> {
  await api.delete('/auth/account');
}
