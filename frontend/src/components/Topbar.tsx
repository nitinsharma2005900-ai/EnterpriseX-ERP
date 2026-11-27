'use client';

import React, { useState } from 'react';
import {
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { GlobalSearchModal } from './GlobalSearchModal';
import { NotificationModal } from './NotificationModal';

export function Topbar() {
  const { user, demoAccounts, switchRole } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [roleDropdown, setRoleDropdown] = useState(false);

  return (
    <header className="h-16 border-b border-sage/30 dark:border-charcoal-50 bg-ivory-50/80 dark:bg-charcoal/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Search trigger */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-3 px-4 py-2 rounded-xl bg-ivory dark:bg-charcoal-50 border border-sage/30 dark:border-charcoal-100 text-charcoal/60 dark:text-ivory/60 hover:border-emerald/50 transition w-64 text-sm shadow-sm"
        >
          <Search size={16} className="text-emerald" />
          <span>Quick search...</span>
          <kbd className="ml-auto text-[10px] bg-sage/20 dark:bg-charcoal px-1.5 py-0.5 rounded text-charcoal/70 dark:text-ivory/70 font-mono">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Instant Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdown(!roleDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald/10 dark:bg-emerald/20 border border-emerald/30 text-emerald dark:text-sage text-xs font-semibold hover:bg-emerald/20 transition"
          >
            <Shield size={14} className="text-emerald" />
            <span className="hidden sm:inline">Role:</span>
            <span className="font-bold underline">{user?.role?.replace('_', ' ') || 'Select Role'}</span>
            <ChevronDown size={14} />
          </button>

          {roleDropdown && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-ivory-50 dark:bg-charcoal border border-sage/30 dark:border-charcoal-50 shadow-xl p-2 z-50">
              <div className="p-2 border-b border-sage/20 dark:border-charcoal-50 mb-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-charcoal/50 dark:text-ivory/50">
                  Switch Active ERP Role
                </p>
                <p className="text-xs text-charcoal/80 dark:text-ivory/80">
                  Instant demo role impersonation with real permissions:
                </p>
              </div>

              <div className="space-y-1">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    onClick={() => {
                      switchRole(acc.email);
                      setRoleDropdown(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition flex flex-col gap-0.5 ${
                      user?.email === acc.email
                        ? 'bg-emerald text-ivory font-bold'
                        : 'hover:bg-sage/15 dark:hover:bg-charcoal-50 text-charcoal dark:text-ivory'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{acc.roleLabel}</span>
                      <span className="text-[10px] opacity-80">
                        {acc.approvalLimit > 0 ? `Limit $${(acc.approvalLimit / 1000).toFixed(0)}k` : 'Staff'}
                      </span>
                    </div>
                    <span className="text-[10px] opacity-75 truncate">{acc.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Button */}
        <button
          onClick={() => setNotifOpen(true)}
          className="p-2 rounded-xl text-charcoal/70 dark:text-ivory/70 hover:bg-sage/20 dark:hover:bg-charcoal-50 relative transition"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber ring-2 ring-ivory-50 dark:ring-charcoal" />
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-charcoal/70 dark:text-ivory/70 hover:bg-sage/20 dark:hover:bg-charcoal-50 transition"
          aria-label="Toggle Theme"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Notification Drawer Modal */}
      <NotificationModal isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
    </header>
  );
}
