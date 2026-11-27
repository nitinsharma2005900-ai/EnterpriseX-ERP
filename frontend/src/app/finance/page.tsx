'use client';

import React, { useEffect, useState } from 'react';
import {
  Landmark,
  Plus,
  Lock,
  Unlock,
  CheckCircle,
  AlertCircle,
  BookOpen,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { StatusBadge } from '../../components/StatusBadge';

export default function FinancePage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Journal Posting Modal State
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [entryNumber, setEntryNumber] = useState('');
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [journalDescription, setJournalDescription] = useState('');
  const [journalLines, setJournalLines] = useState<Array<{ accountId: string; debit: number; credit: number; description?: string }>>([
    { accountId: '', debit: 0, credit: 0 },
    { accountId: '', debit: 0, credit: 0 },
  ]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchApi('/finance/accounts'),
      fetchApi('/finance/periods'),
      fetchApi('/finance/journals'),
    ])
      .then(([accRes, perRes, jRes]) => {
        if (accRes.success) setAccounts(accRes.data);
        if (perRes.success) {
          setPeriods(perRes.data);
          const openP = perRes.data.find((p: any) => p.status === 'OPEN');
          if (openP) setSelectedPeriodId(openP.id);
        }
        if (jRes.success) setJournals(jRes.data);
      })
      .catch((err) => setErrorMsg(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    setEntryNumber(`JE-${Date.now().toString().slice(-6)}`);
  }, []);

  const handleLineChange = (index: number, field: 'accountId' | 'debit' | 'credit', value: any) => {
    const updated = [...journalLines];
    (updated[index] as any)[field] = value;
    setJournalLines(updated);
  };

  const totalDebits = journalLines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredits = journalLines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.001 && totalDebits > 0;

  const handlePostJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isBalanced) {
      setErrorMsg(`Double-entry rule violation: Debits ($${totalDebits.toFixed(2)}) must equal Credits ($${totalCredits.toFixed(2)}).`);
      return;
    }

    try {
      const res = await fetchApi('/finance/journals', {
        method: 'POST',
        body: JSON.stringify({
          entryNumber,
          periodId: selectedPeriodId,
          referenceType: 'MANUAL',
          description: journalDescription,
          lines: journalLines.map((l) => ({
            accountId: l.accountId,
            debit: Number(l.debit || 0),
            credit: Number(l.credit || 0),
          })),
        }),
      });

      if (res.success) {
        setSuccessMsg(`Journal Entry ${res.data.entryNumber} posted and General Ledger balances updated!`);
        setJournalModalOpen(false);
        setEntryNumber(`JE-${Date.now().toString().slice(-6)}`);
        setJournalDescription('');
        loadData();
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald uppercase tracking-wider">Financial Management</span>
          <h1 className="text-2xl font-black text-charcoal dark:text-ivory mt-0.5">
            Chart of Accounts & General Ledger
          </h1>
          <p className="text-xs text-charcoal/60 dark:text-ivory/60 mt-1">
            GAAP & IFRS double-entry accounting engine, financial period close governance, and journal posting.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setJournalModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald hover:bg-emerald-600 text-ivory text-xs font-bold shadow-md transition active:scale-95 self-start"
        >
          <Plus size={16} />
          <span>Post Manual Journal Entry</span>
        </button>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-amber/15 border border-amber/30 text-amber text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald/15 border border-emerald/30 text-emerald text-xs font-semibold flex items-center gap-2">
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Financial Periods Overview */}
      <div className="p-5 rounded-3xl bg-ivory-50 dark:bg-charcoal border border-sage/30 dark:border-charcoal-50 shadow-sm">
        <h3 className="font-bold text-sm text-charcoal dark:text-ivory mb-3">Fiscal Reporting Periods</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {periods.map((p) => (
            <div key={p.id} className="p-3 rounded-2xl bg-ivory dark:bg-charcoal-50 border border-sage/20 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-charcoal dark:text-ivory">{p.name}</span>
                <span className="text-[10px] text-charcoal/50 block">
                  {formatDate(p.startDate)} – {formatDate(p.endDate)}
                </span>
              </div>
              <StatusBadge status={p.status} />
            </div>
          ))}
        </div>
      </div>

      {/* Chart of Accounts Grid */}
      <div className="bg-ivory-50 dark:bg-charcoal rounded-3xl border border-sage/30 dark:border-charcoal-50 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-sage/20 flex items-center justify-between">
          <h3 className="font-bold text-sm text-charcoal dark:text-ivory">Chart of Accounts (COA)</h3>
          <span className="text-xs text-emerald font-semibold">{accounts.length} GL Accounts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-sage/20 bg-sage/5 dark:bg-charcoal-50 text-charcoal/60 dark:text-ivory/60 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 font-bold">Code</th>
                <th className="py-3 px-4 font-bold">Account Name</th>
                <th className="py-3 px-4 font-bold">Category</th>
                <th className="py-3 px-4 font-bold">Subcategory</th>
                <th className="py-3 px-4 font-bold text-right">Current Balance (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/10">
              {accounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-sage/10 transition">
                  <td className="py-3 px-4 font-mono font-bold text-charcoal dark:text-ivory">{acc.code}</td>
                  <td className="py-3 px-4 font-semibold text-charcoal dark:text-ivory">{acc.name}</td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sage/20 text-charcoal dark:text-ivory">
                      {acc.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-charcoal/60">{acc.subcategory}</td>
                  <td className="py-3 px-4 text-right font-bold text-emerald">
                    {formatCurrency(acc.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Post Journal Entry Modal */}
      {journalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-ivory-50 dark:bg-charcoal border border-sage/40 dark:border-charcoal-50 shadow-2xl p-6">
            <h3 className="text-base font-bold text-charcoal dark:text-ivory mb-1">
              Post Double-Entry Journal Entry
            </h3>
            <p className="text-xs text-charcoal/60 dark:text-ivory/60 mb-4">
              Strict accounting invariant: Sum of Debits must equal Sum of Credits.
            </p>

            <form onSubmit={handlePostJournal} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-charcoal/80 dark:text-ivory/80 uppercase mb-1">
                    Entry Reference Number
                  </label>
                  <input
                    type="text"
                    required
                    value={entryNumber}
                    onChange={(e) => setEntryNumber(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-sage/40 dark:border-charcoal-100 bg-ivory dark:bg-charcoal text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-charcoal/80 dark:text-ivory/80 uppercase mb-1">
                    Financial Reporting Period
                  </label>
                  <select
                    required
                    value={selectedPeriodId}
                    onChange={(e) => setSelectedPeriodId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-sage/40 dark:border-charcoal-100 bg-ivory dark:bg-charcoal text-xs font-semibold"
                  >
                    {periods.map((p) => (
                      <option key={p.id} value={p.id} disabled={p.status !== 'OPEN'}>
                        {p.name} ({p.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal/80 dark:text-ivory/80 uppercase mb-1">
                  Journal Description
                </label>
                <input
                  type="text"
                  required
                  value={journalDescription}
                  onChange={(e) => setJournalDescription(e.target.value)}
                  placeholder="e.g. Accrued supplier freight adjustment"
                  className="w-full p-2.5 rounded-xl border border-sage/40 dark:border-charcoal-100 bg-ivory dark:bg-charcoal text-xs"
                />
              </div>

              {/* Debit & Credit Lines */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-charcoal/80 dark:text-ivory/80 uppercase block">
                  Transaction Lines
                </label>

                {journalLines.map((line, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-sage/10 dark:bg-charcoal-50">
                    <select
                      required
                      value={line.accountId}
                      onChange={(e) => handleLineChange(idx, 'accountId', e.target.value)}
                      className="flex-1 p-2 rounded-lg border border-sage/30 dark:border-charcoal-100 bg-ivory dark:bg-charcoal text-xs font-medium"
                    >
                      <option value="">-- Select GL Account --</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} - {a.name} ({a.category})
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.debit || ''}
                      onChange={(e) => handleLineChange(idx, 'debit', Number(e.target.value))}
                      placeholder="Debit ($)"
                      className="w-28 p-2 rounded-lg border border-sage/30 dark:border-charcoal-100 bg-ivory dark:bg-charcoal text-xs text-right font-bold"
                    />

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.credit || ''}
                      onChange={(e) => handleLineChange(idx, 'credit', Number(e.target.value))}
                      placeholder="Credit ($)"
                      className="w-28 p-2 rounded-lg border border-sage/30 dark:border-charcoal-100 bg-ivory dark:bg-charcoal text-xs text-right font-bold"
                    />
                  </div>
                ))}
              </div>

              {/* Invariant verification pill */}
              <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${isBalanced ? 'bg-emerald/15 border-emerald/30 text-emerald' : 'bg-amber/15 border-amber/30 text-amber'}`}>
                <div className="flex items-center gap-2">
                  <ShieldAlert size={16} />
                  <span className="font-bold">
                    {isBalanced ? 'Balanced Double-Entry' : 'Imbalance Detected'}
                  </span>
                </div>
                <div className="flex gap-4 font-mono font-bold">
                  <span>Debits: ${totalDebits.toFixed(2)}</span>
                  <span>Credits: ${totalCredits.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-sage/20">
                <button
                  type="button"
                  onClick={() => setJournalModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-charcoal/60 hover:bg-sage/15"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isBalanced}
                  className="px-5 py-2.5 rounded-xl bg-emerald hover:bg-emerald-600 text-ivory text-xs font-bold shadow-md disabled:opacity-40 transition"
                >
                  Post Journal Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
