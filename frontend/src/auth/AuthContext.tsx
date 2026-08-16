import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import apiClient, { clearToken, extractErrorMessage, getToken, setToken } from '../api/client';

export type UserRole =
  | 'SX_ADMIN'
  | 'SX_FINANCE'
  | 'SX_PURCHASING'
  | 'SX_SALES'
  | 'SX_PRODUCTION'
  | 'SX_SYSTEM'
  | 'SX_SECURITY';

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  effectiveRoles: UserRole[];
}

export interface AppSummary {
  id: string;
  key: string;
  title: string;
  icon: string;
  color: string;
  active: boolean;
  sortOrder: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  apps: AppSummary[];
  loading: boolean;
  login: (username: string, password: string, keepSignedIn: boolean) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [apps, setApps] = useState<AppSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadApps = () => {
    apiClient
      .get<AppSummary[]>('/apps')
      .then((res) => setApps(res.data))
      .catch(() => setApps([]));
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    apiClient
      .get<AuthUser>('/auth/me')
      .then((res) => {
        setUser(res.data);
        loadApps();
      })
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string, keepSignedIn: boolean) => {
    try {
      const res = await apiClient.post('/auth/login', { username, password });
      setToken(res.data.accessToken, keepSignedIn);
      setUser(res.data.user);
      loadApps();
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  };

  const logout = () => {
    // Best-effort: registra o logout no log de auditoria antes de derrubar o
    // token. Não bloqueia a saída do usuário se a chamada falhar.
    apiClient.post('/auth/logout').catch(() => {});
    clearToken();
    setUser(null);
    setApps([]);
  };

  const value = useMemo(() => ({ user, apps, loading, login, logout }), [user, apps, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider.');
  }
  return ctx;
}
