import React from 'react';
import { cn } from '../lib/utils';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const s = status ? status.toUpperCase() : 'UNKNOWN';

  let colorClasses = 'bg-sage/20 text-charcoal dark:text-ivory border-sage/40';

  if (['APPROVED', 'COMPLETED', 'PAID', 'POSTED', 'MATCHED', 'OPEN', 'ACTIVE', 'HEALTHY', 'RESOLVED'].includes(s)) {
    colorClasses = 'bg-emerald/15 text-emerald dark:text-sage border-emerald/30';
  } else if (['PENDING', 'PENDING_APPROVAL', 'PARTIALLY_PAID', 'PARTIALLY_RECEIVED', 'DISCREPANCY', 'RESERVED', 'INVESTIGATING'].includes(s)) {
    colorClasses = 'bg-amber/15 text-amber border-amber/30';
  } else if (['REJECTED', 'CANCELLED', 'VOIDED', 'CLOSED', 'LOCKED', 'UNHEALTHY', 'INCIDENTS_DETECTED'].includes(s)) {
    colorClasses = 'bg-charcoal/10 dark:bg-charcoal-50 text-charcoal/80 dark:text-ivory/80 border-charcoal/30';
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase border',
        colorClasses
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {s.replace(/_/g, ' ')}
    </span>
  );
}
