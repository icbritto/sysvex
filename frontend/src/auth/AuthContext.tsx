import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import apiClient, { clearToken, extractErrorMessage, getToken, setToken } from '../api/client';

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: 'ADMIN' | 'FINANCE' | 'PURCHASING' | 'SALES' | 'PRODUCTION';
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string, keepSignedIn: boolean) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    apiClient
      .get<AuthUser>('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string, keepSignedIn: boolean) => {
    try {
      const res = await apiClient.post('/auth/login', { username, password });
      setToken(res.data.accessToken, keepSignedIn);
      setUser(res.data.user);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider.');
  }
  return ctx;
}
