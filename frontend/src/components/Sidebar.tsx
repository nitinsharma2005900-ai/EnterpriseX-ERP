'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Truck,
  Package,
  BadgeDollarSign,
  Receipt,
  Landmark,
  FileBarChart2,
  GitFork,
  ShieldCheck,
  Activity,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    { label: 'Executive Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Procurement & POs', href: '/procurement', icon: ShoppingCart },
    { label: 'Goods Receipt & GRN', href: '/logistics', icon: Truck },
    { label: 'Inventory & Warehouses', href: '/inventory', icon: Package },
    { label: 'Sales & Fulfillment', href: '/sales', icon: BadgeDollarSign },
    { label: 'Invoices & Payments', href: '/billing', icon: Receipt },
    { label: 'Finance & General Ledger', href: '/finance', icon: Landmark },
    { label: 'Business Reports', href: '/reports', icon: FileBarChart2 },
    { label: 'Transaction Workflows', href: '/workflows', icon: GitFork },
    { label: 'Immutable Audit Trail', href: '/audit', icon: ShieldCheck },
    { label: 'Admin & Incidents', href: '/admin', icon: Activity },
  ];

  return (
    <aside
      className={cn(
        'h-screen sticky top-0 flex flex-col justify-between border-r border-sage/30 dark:border-charcoal-50 bg-ivory-50 dark:bg-charcoal transition-all duration-300 z-30',
        collapsed ? 'w-20' : 'w-72'
      )}
    >
      <div>
        {/* Brand Header */}
        <div className="p-4 flex items-center justify-between border-b border-sage/20 dark:border-charcoal-50">
          <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-emerald flex items-center justify-center text-ivory font-black text-xl shadow-md shrink-0">
              EX
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-extrabold text-lg tracking-tight text-charcoal dark:text-ivory leading-tight">
                  EnterpriseX
                </span>
                <span className="text-[10px] font-semibold text-emerald tracking-wider uppercase">
                  Integrated ERP Suite
                </span>
              </div>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-charcoal/60 dark:text-ivory/60 hover:bg-sage/20 dark:hover:bg-charcoal-50 transition"
            aria-label="Toggle Sidebar"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group relative',
                  active
                    ? 'bg-emerald text-ivory shadow-sm font-semibold'
                    : 'text-charcoal/80 dark:text-ivory/80 hover:bg-sage/15 dark:hover:bg-charcoal-50'
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  size={20}
                  className={cn(
                    'shrink-0 transition-transform group-hover:scale-105',
                    active ? 'text-ivory' : 'text-emerald dark:text-sage'
                  )}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {active && !collapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Card & Logout */}
      <div className="p-3 border-t border-sage/20 dark:border-charcoal-50">
        {!collapsed && user && (
          <div className="mb-2 p-2.5 rounded-xl bg-sage/10 dark:bg-charcoal-50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald/20 text-emerald flex items-center justify-center font-bold text-sm shrink-0 border border-emerald/30">
              {user.fullName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-charcoal dark:text-ivory truncate">{user.fullName}</p>
              <p className="text-[10px] font-semibold text-emerald truncate">
                {user.role.replace('_', ' ')}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className={cn(
            'w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-amber hover:bg-amber/10 transition',
            collapsed && 'justify-center'
          )}
          title="Sign Out"
        >
          <LogOut size={16} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
