import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { apiClient, setAccessToken } from '../lib/api-client';
export type Role = 'ADMIN' | 'STAFF' | 'CUSTOMER';
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}
interface Session {
  accessToken: string;
  user: User;
}
const Context = createContext<{
  user: User | null;
  loading: boolean;
  authenticate: (path: string, body: unknown) => Promise<User>;
  logout: () => Promise<void>;
}>({
  user: null,
  loading: true,
  authenticate: async () => {
    throw new Error('AuthProvider missing');
  },
  logout: async () => {},
});
let restore: Promise<Session> | null = null;
export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    restore ??= apiClient<Session>('/auth/refresh', { method: 'POST' });
    void restore
      .then((session) => {
        if (active) {
          setAccessToken(session.accessToken);
          setUser(session.user);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    const expire = () => {
      client.clear();
      setUser(null);
      setAccessToken(null);
    };
    window.addEventListener('brightloop:session-expired', expire);
    return () => {
      active = false;
      window.removeEventListener('brightloop:session-expired', expire);
    };
  }, []);
  async function authenticate(path: string, body: unknown) {
    const session = await apiClient<Session>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    setAccessToken(session.accessToken);
    setUser(session.user);
    return session.user;
  }
  async function logout() {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setAccessToken(null);
      restore = null;
      client.clear();
    }
  }
  return (
    <Context.Provider value={{ user, loading, authenticate, logout }}>
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  return useContext(Context);
}
export function RequireRole({ roles }: { roles: Role[] }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="p-8" role="status">
        Restoring your session…
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role))
    return (
      <Navigate
        to={user.role === 'CUSTOMER' ? '/portal' : '/app/dashboard'}
        replace
      />
    );
  return <Outlet />;
}
