'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '../lib/api';
import { X, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationModal({ isOpen, onClose }: NotificationModalProps) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { if (isOpen) { void fetchApi('/notifications').then(r => setAlerts(r.data)).catch(e => setError(e.message)); } }, [isOpen]);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-charcoal/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-ivory-50 dark:bg-charcoal border border-sage/40 dark:border-charcoal-50 shadow-2xl p-5 mt-14 animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-sage/20 dark:border-charcoal-50">
          <h3 className="font-bold text-sm text-charcoal dark:text-ivory">Notification Center</h3>
          <button onClick={onClose} className="p-1 rounded text-charcoal/50 hover:bg-sage/20">
            <X size={16} />
          </button>
        </div>

        <div className="mt-3 space-y-2.5">
          {error && <p role="alert" className="text-amber">{error}</p>}
          {!error && alerts.length === 0 && <p className="text-xs">No pending notifications.</p>}
          {alerts.map((a) => (
            <div
              key={a.id}
              className="p-3 rounded-xl bg-ivory dark:bg-charcoal-50 border border-sage/20 dark:border-charcoal-100 flex gap-3 text-xs"
            >
              {a.type === 'WARNING' && <AlertTriangle size={16} className="text-amber shrink-0 mt-0.5" />}
              {a.type === 'INFO' && <AlertCircle size={16} className="text-emerald shrink-0 mt-0.5" />}
              {a.type === 'SUCCESS' && <CheckCircle2 size={16} className="text-emerald shrink-0 mt-0.5" />}
              <div>
                <p className="font-bold text-charcoal dark:text-ivory leading-tight">{a.title}</p>
                <p className="text-[11px] text-charcoal/70 dark:text-ivory/70 mt-1">{a.desc}</p>
                <span className="text-[9px] text-charcoal/40 dark:text-ivory/40 mt-1 block">{new Date(a.time).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
