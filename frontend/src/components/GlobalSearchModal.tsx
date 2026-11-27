'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ArrowRight, Package, ShoppingCart, Receipt, Landmark } from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const quickLinks = [
    { title: 'Purchase Orders', href: '/procurement', icon: ShoppingCart, category: 'Procurement' },
    { title: 'Inventory SKUs & Stock', href: '/inventory', icon: Package, category: 'Supply Chain' },
    { title: 'Invoices & Settlements', href: '/billing', icon: Receipt, category: 'Billing' },
    { title: 'General Ledger & Journals', href: '/finance', icon: Landmark, category: 'Finance' },
  ];

  const filtered = quickLinks.filter((l) =>
    l.title.toLowerCase().includes(query.toLowerCase()) || l.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-charcoal/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl bg-ivory-50 dark:bg-charcoal border border-sage/40 dark:border-charcoal-50 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-sage/20 dark:border-charcoal-50 flex items-center gap-3">
          <Search size={18} className="text-emerald" />
          <input
            type="text"
            placeholder="Search transactions, accounts, SKUs, or modules..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none text-charcoal dark:text-ivory placeholder-charcoal/40 dark:placeholder-ivory/40 text-sm focus:outline-none"
            autoFocus
          />
          <button onClick={onClose} className="p-1 rounded text-charcoal/50 dark:text-ivory/50 hover:bg-sage/20">
            <X size={16} />
          </button>
        </div>

        <div className="p-3 max-h-80 overflow-y-auto">
          <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-charcoal/40 dark:text-ivory/40">
            Quick Navigation
          </p>
          <div className="space-y-1">
            {filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-sage/15 dark:hover:bg-charcoal-50 text-left transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald/10 text-emerald flex items-center justify-center">
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-charcoal dark:text-ivory">{item.title}</p>
                      <p className="text-[11px] text-charcoal/50 dark:text-ivory/50">{item.category}</p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-emerald opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
