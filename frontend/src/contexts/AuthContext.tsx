import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthUser } from '../types';
import { apiGet, apiPost } from '../lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  acceptConsent: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setLoading(false); return; }
    try {
      const data = await apiGet<{ userId: number; email: string; role: string; profile: Record<string, unknown> }>('/auth/me');
      const profile = data.profile as Record<string, unknown>;
      const role = data.role as AuthUser['role'];

      let name = '';
      let profileId = 0;
      if (role === 'doctor') { name = `Dr. ${profile.docFirstName} ${profile.docLastName}`; profileId = profile.docId as number; }
      else if (role === 'patient') { name = `${profile.patFirstName} ${profile.patLastName}`; profileId = profile.patId as number; }
      else if (role === 'admin') { name = `${profile.adminFirstName} ${profile.adminLastName}`; profileId = profile.adminId as number; }

      setUser({ userId: data.userId, email: data.email, role, profileId, name, needsConsent: role === 'patient' && !profile.patConsentAt });
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    const data = await apiPost<{ accessToken: string; refreshToken: string; user: AuthUser }>('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  }, []);

  const acceptConsent = useCallback(async () => {
    await apiPost('/auth/consent');
    setUser(prev => prev ? { ...prev, needsConsent: false } : prev);
  }, []);

  const refreshUser = useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, acceptConsent, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
