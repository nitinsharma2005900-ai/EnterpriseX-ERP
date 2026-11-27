'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../lib/permissions';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!loading && !user && pathname !== '/login') router.replace('/login'); }, [loading, user, pathname, router]);
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <main className="min-h-screen bg-ivory dark:bg-charcoal">{children}</main>;
  }

  if (loading || !user) return <main className="p-8 text-emerald">Loading workspace...</main>;
  if (!canAccess(user.role, pathname)) return <main className="p-8 text-amber">You do not have permission to view this module.</main>;
  return (
    <div className="flex min-h-screen bg-ivory dark:bg-charcoal text-charcoal dark:text-ivory">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-3 sm:p-6 overflow-y-auto max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
