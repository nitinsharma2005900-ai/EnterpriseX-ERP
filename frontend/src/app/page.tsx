'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-ivory dark:bg-charcoal">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald flex items-center justify-center text-ivory font-black text-2xl animate-pulse">
          EX
        </div>
        <p className="text-sm font-semibold text-charcoal/70 dark:text-ivory/70">
          Loading EnterpriseX ERP...
        </p>
      </div>
    </div>
  );
}
