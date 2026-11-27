'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, ArrowRight, Lock, Mail, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const { login, demoAccounts, loading } = useAuth();
  const [email, setEmail] = useState('admin@enterprisex.com');
  const [password, setPassword] = useState('EnterpriseX2026!');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    }
  };

  const handleDemoClick = async (demoEmail: string) => {
    setEmail(demoEmail);
    setError(null);
    try { await login(demoEmail, 'EnterpriseX2026!'); } catch (error: any) { setError(error.message); }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-ivory dark:bg-charcoal selection:bg-emerald selection:text-ivory">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-emerald items-center justify-center text-ivory font-black text-3xl shadow-lg mb-4">
          EX
        </div>
        <h2 className="text-3xl font-extrabold text-charcoal dark:text-ivory tracking-tight">
          EnterpriseX
        </h2>
        <p className="mt-1 text-sm font-medium text-emerald dark:text-sage">
          Integrated Finance, Procurement, Inventory & Sales ERP
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-ivory-50 dark:bg-charcoal-50 py-8 px-6 shadow-xl rounded-3xl border border-sage/30 dark:border-charcoal-100 sm:px-10">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-amber/15 border border-amber/30 text-amber text-xs font-semibold">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-charcoal/80 dark:text-ivory/80 uppercase tracking-wider mb-1">
                Corporate Email Address
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-charcoal/40">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 rounded-xl border border-sage/40 dark:border-charcoal-100 bg-ivory dark:bg-charcoal text-charcoal dark:text-ivory text-sm focus:ring-2 focus:ring-emerald focus:border-emerald transition"
                  placeholder="name@enterprisex.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-charcoal/80 dark:text-ivory/80 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-charcoal/40">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 rounded-xl border border-sage/40 dark:border-charcoal-100 bg-ivory dark:bg-charcoal text-charcoal dark:text-ivory text-sm focus:ring-2 focus:ring-emerald focus:border-emerald transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-md text-sm font-bold text-ivory bg-emerald hover:bg-emerald-600 active:scale-[0.99] transition disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Synthetic Demo Account Buttons */}
          <div className="mt-8 pt-6 border-t border-sage/20 dark:border-charcoal-100">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={16} className="text-emerald" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal/70 dark:text-ivory/70">
                1-Click Synthetic Role Demo Logins
              </h3>
            </div>
            <p className="text-xs text-charcoal/60 dark:text-ivory/60 mb-4">
              Click any of the 6 pre-configured synthetic accounts to sign in immediately:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleDemoClick(acc.email)}
                  className="p-3 rounded-2xl bg-sage/10 dark:bg-charcoal border border-sage/30 dark:border-charcoal-100 text-left hover:border-emerald hover:bg-emerald/5 transition group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-charcoal dark:text-ivory group-hover:text-emerald">
                      {acc.roleLabel}
                    </span>
                    <CheckCircle2 size={14} className="text-emerald opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[10px] text-charcoal/50 dark:text-ivory/50 truncate mt-0.5">
                    {acc.email}
                  </p>
                  <p className="text-[10px] font-semibold text-amber mt-1">
                    {acc.approvalLimit > 0 ? `Approval Limit: $${(acc.approvalLimit).toLocaleString()}` : 'Standard Staff'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
