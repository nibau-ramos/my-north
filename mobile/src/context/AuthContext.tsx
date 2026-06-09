import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMe } from '../services/authService';
import type { UserProvider } from '../services/authService';

const TOKEN_KEY = '@mynorth_token';

interface User {
  id: string;
  email: string;
  provider: UserProvider;
}

type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; token: string; user: User };

interface AuthContextValue {
  authState: AuthState;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (!token) {
          setAuthState({ status: 'unauthenticated' });
          return;
        }
        const { user } = await getMe(token);
        setAuthState({ status: 'authenticated', token, user });
      } catch {
        await AsyncStorage.removeItem(TOKEN_KEY);
        setAuthState({ status: 'unauthenticated' });
      }
    })();
  }, []);

  const login = useCallback(async (token: string, user: User) => {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    setAuthState({ status: 'authenticated', token, user });
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setAuthState({ status: 'unauthenticated' });
  }, []);

  return (
    <AuthContext.Provider value={{ authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
