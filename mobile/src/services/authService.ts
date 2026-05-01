import api, { setAuthToken } from './api';

interface AuthResponse {
  token: string;
  user: { id: string; email: string };
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

export async function getMe(token: string): Promise<{ user: { id: string; email: string } }> {
  setAuthToken(token);
  const res = await api.get<{ user: { id: string; email: string } }>('/auth/me');
  return res.data;
}
