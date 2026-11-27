'use client';
import { queryClient } from '../lib/query';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '../lib/api';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  approvalLimit: number;
  organizationName?: string;
  branchName?: string;
  departmentName?: string;
  warehouseName?: string;
}

export interface DemoAccount {
  role: string;
  roleLabel: string;
  email: string;
  description: string;
  approvalLimit: number;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  demoAccounts: DemoAccount[];
  login: (email: string, password?: string) => Promise<void>;
  switchRole: (email: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  demoAccounts: [],
  login: async () => {},
  switchRole: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Load available demo accounts
    fetchApi('/auth/demo-accounts')
      .then((res) => {
        if (res.success) setDemoAccounts(res.data);
      })
      .catch(() => {});

    const storedToken = localStorage.getItem('enterprisex_token');
    if (!storedToken) { setLoading(false); return; }
    fetchApi('/auth/me').then(res => {
      setUser(res.data); setToken(localStorage.getItem('enterprisex_token'));
      localStorage.setItem('enterprisex_user', JSON.stringify(res.data));
    }).catch(() => {
      localStorage.removeItem('enterprisex_token'); localStorage.removeItem('enterprisex_refresh'); localStorage.removeItem('enterprisex_user');
    }).finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password = 'EnterpriseX2026!') => {
    setLoading(true);
    try {
      const res = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (res.success) {
        const u = res.data.user;
        const t = res.data.accessToken;
        queryClient.clear();
        localStorage.setItem('enterprisex_refresh', res.data.refreshToken);
        setUser(u);
        setToken(t);
        localStorage.setItem('enterprisex_token', t);
        localStorage.setItem('enterprisex_user', JSON.stringify(u));
        router.push('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const switchRole = async (email: string) => {
    await login(email);
  };

  const logout = () => {
    void fetchApi('/auth/logout', { method: 'POST' }).catch(() => {});
    queryClient.clear();
    localStorage.removeItem('enterprisex_refresh');
    setUser(null);
    setToken(null);
    localStorage.removeItem('enterprisex_token');
    localStorage.removeItem('enterprisex_user');
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        demoAccounts,
        login,
        switchRole,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
