'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon: LucideIcon;
  subtext?: string;
  badge?: string;
}

export function KPICard({
  title,
  value,
  change,
  isPositive = true,
  icon: Icon,
  subtext,
  badge,
}: KPICardProps) {
  return (
    <div className="p-5 rounded-2xl bg-ivory-50 dark:bg-charcoal border border-sage/30 dark:border-charcoal-50 shadow-sm hover:shadow-md transition-all duration-200 group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-charcoal/60 dark:text-ivory/60 tracking-wider uppercase">
          {title}
        </span>
        <div className="w-10 h-10 rounded-xl bg-emerald/10 dark:bg-emerald/20 text-emerald dark:text-sage flex items-center justify-center group-hover:scale-110 transition-transform">
          <Icon size={20} />
        </div>
      </div>

      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-2xl font-black text-charcoal dark:text-ivory tracking-tight">
          {value}
        </h3>
        {badge && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber/15 text-amber border border-amber/30">
            {badge}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs">
        {change && (
          <span
            className={cn(
              'font-bold px-1.5 py-0.5 rounded',
              isPositive
                ? 'bg-emerald/15 text-emerald dark:text-sage'
                : 'bg-amber/15 text-amber'
            )}
          >
            {change}
          </span>
        )}
        {subtext && (
          <span className="text-charcoal/50 dark:text-ivory/50 truncate">
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
}
