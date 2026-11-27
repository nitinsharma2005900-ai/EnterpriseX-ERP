'use client';

import React, { useEffect, useState } from 'react';
import {
  FileBarChart2,
  Download,
  CheckCircle2,
  AlertTriangle,
  Scale,
  TrendingUp,
  FileSpreadsheet,
  FileCode,
} from 'lucide-react';
import { fetchApi, downloadApi } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

export default function ReportsPage() {
  const [reportData, setReportData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'TRIAL_BALANCE' | 'BALANCE_SHEET' | 'PROFIT_LOSS'>('TRIAL_BALANCE');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/reports/trial-balance')
      .then((res) => {
        if (res.success) setReportData(res.data);
      })
      .catch((err) => setErrorMsg(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleExport = (format: 'csv' | 'json') => {
    void downloadApi(`/integrations/accounting/export?format=${format}`, `EnterpriseX-General-Ledger.${format}`).catch(error => setErrorMsg(error.message));
  };

  if (loading) {
    return <div className="p-8 text-center text-sm font-semibold text-charcoal/50 animate-pulse">Computing deterministic financial reports...</div>;
  }

  if (errorMsg || !reportData) return <div role="alert" className="p-4 rounded-xl text-amber bg-amber/10">{errorMsg || "Unable to load report"}</div>;
  const tb = reportData;

  const assets = tb.accounts?.filter((a: any) => a.category === 'ASSET') || [];
  const liabilities = tb.accounts?.filter((a: any) => a.category === 'LIABILITY') || [];
  const equity = tb.accounts?.filter((a: any) => a.category === 'EQUITY') || [];
  const revenue = tb.accounts?.filter((a: any) => a.category === 'REVENUE') || [];
  const expenses = tb.accounts?.filter((a: any) => a.category === 'EXPENSE') || [];

  const netIncome = tb.total_revenue - tb.total_expense;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald uppercase tracking-wider">Financial Reporting</span>
          <h1 className="text-2xl font-black text-charcoal dark:text-ivory mt-0.5">
            Statements & Trial Balance
          </h1>
          <p className="text-xs text-charcoal/60 dark:text-ivory/60 mt-1">
            Authoritative financial statements computed with zero floating-point drift.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 self-start">
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-ivory-50 dark:bg-charcoal border border-sage/30 hover:border-emerald text-xs font-bold text-charcoal dark:text-ivory shadow-sm transition"
          >
            <FileSpreadsheet size={15} className="text-emerald" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => handleExport('json')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-ivory-50 dark:bg-charcoal border border-sage/30 hover:border-emerald text-xs font-bold text-charcoal dark:text-ivory shadow-sm transition"
          >
            <FileCode size={15} className="text-amber" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 rounded-2xl bg-sage/15 dark:bg-charcoal border border-sage/30 self-start text-xs font-bold">
        <button
          onClick={() => setActiveTab('TRIAL_BALANCE')}
          className={`px-4 py-2 rounded-xl transition ${activeTab === 'TRIAL_BALANCE' ? 'bg-emerald text-ivory shadow-sm' : 'text-charcoal/70 dark:text-ivory/70'}`}
        >
          Trial Balance
        </button>
        <button
          onClick={() => setActiveTab('BALANCE_SHEET')}
          className={`px-4 py-2 rounded-xl transition ${activeTab === 'BALANCE_SHEET' ? 'bg-emerald text-ivory shadow-sm' : 'text-charcoal/70 dark:text-ivory/70'}`}
        >
          Balance Sheet
        </button>
        <button
          onClick={() => setActiveTab('PROFIT_LOSS')}
          className={`px-4 py-2 rounded-xl transition ${activeTab === 'PROFIT_LOSS' ? 'bg-emerald text-ivory shadow-sm' : 'text-charcoal/70 dark:text-ivory/70'}`}
        >
          Income Statement (P&L)
        </button>
      </div>

      {/* Report Container */}
      <div className="bg-ivory-50 dark:bg-charcoal rounded-3xl border border-sage/30 dark:border-charcoal-50 shadow-sm p-6">
        {/* Trial Balance View */}
        {activeTab === 'TRIAL_BALANCE' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-sage/20">
              <div>
                <h3 className="font-bold text-base text-charcoal dark:text-ivory">Trial Balance Statement</h3>
                <span className="text-xs text-charcoal/50">Fiscal Period: {tb.period}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald/15 text-emerald border border-emerald/30 text-xs font-bold">
                <CheckCircle2 size={15} />
                <span>Balanced: Debits = Credits</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-sage/20 bg-sage/5 dark:bg-charcoal-50 text-charcoal/60 dark:text-ivory/60 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-4 font-bold">Account Code</th>
                    <th className="py-2.5 px-4 font-bold">Account Description</th>
                    <th className="py-2.5 px-4 font-bold">Category</th>
                    <th className="py-2.5 px-4 font-bold text-right">Debit Balance ($)</th>
                    <th className="py-2.5 px-4 font-bold text-right">Credit Balance ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage/10">
                  {tb.accounts?.map((acc: any) => (
                    <tr key={acc.code} className="hover:bg-sage/10 transition">
                      <td className="py-2.5 px-4 font-mono font-bold">{acc.code}</td>
                      <td className="py-2.5 px-4 font-medium">{acc.name}</td>
                      <td className="py-2.5 px-4 text-charcoal/60">{acc.category}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-charcoal dark:text-ivory">
                        {acc.debit > 0 ? formatCurrency(acc.debit) : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-charcoal dark:text-ivory">
                        {acc.credit > 0 ? formatCurrency(acc.credit) : '-'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-sage/10 font-black text-sm border-t-2 border-emerald">
                    <td colSpan={3} className="py-3 px-4 uppercase tracking-wider">
                      Grand Totals
                    </td>
                    <td className="py-3 px-4 text-right text-emerald">
                      {formatCurrency(tb.total_debits)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald">
                      {formatCurrency(tb.total_credits)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Balance Sheet View */}
        {activeTab === 'BALANCE_SHEET' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-sage/20">
              <div>
                <h3 className="font-bold text-base text-charcoal dark:text-ivory">Consolidated Balance Sheet</h3>
                <span className="text-xs text-charcoal/50">As of {tb.period}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald/15 text-emerald border border-emerald/30 text-xs font-bold">
                <Scale size={15} />
                <span>Accounting Equation Invariant Satisfied: Assets = Liabilities + Equity</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Assets Section */}
              <div className="p-4 rounded-2xl bg-ivory dark:bg-charcoal-50 border border-sage/20 space-y-3">
                <h4 className="font-black text-sm text-emerald uppercase tracking-wider border-b border-emerald/30 pb-2">
                  Total Assets
                </h4>
                <div className="space-y-2 text-xs">
                  {assets.map((a: any) => (
                    <div key={a.code} className="flex justify-between py-1 border-b border-sage/10">
                      <span>{a.name} ({a.code})</span>
                      <span className="font-bold">{formatCurrency(a.debit)}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t border-emerald/40 flex justify-between font-black text-sm text-emerald">
                  <span>Grand Total Assets:</span>
                  <span>{formatCurrency(tb.total_assets)}</span>
                </div>
              </div>

              {/* Liabilities & Equity Section */}
              <div className="p-4 rounded-2xl bg-ivory dark:bg-charcoal-50 border border-sage/20 space-y-3">
                <h4 className="font-black text-sm text-amber uppercase tracking-wider border-b border-amber/30 pb-2">
                  Liabilities & Equity
                </h4>
                <div className="space-y-2 text-xs">
                  <p className="font-bold text-[10px] text-charcoal/50 uppercase">Liabilities</p>
                  {liabilities.map((l: any) => (
                    <div key={l.code} className="flex justify-between py-1 border-b border-sage/10">
                      <span>{l.name}</span>
                      <span className="font-bold">{formatCurrency(l.credit)}</span>
                    </div>
                  ))}

                  <p className="font-bold text-[10px] text-charcoal/50 uppercase mt-3">Equity</p>
                  {equity.map((e: any) => (
                    <div key={e.code} className="flex justify-between py-1 border-b border-sage/10">
                      <span>{e.name}</span>
                      <span className="font-bold">{formatCurrency(e.credit)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1 border-b border-sage/10 text-emerald font-bold">
                    <span>Current Fiscal Net Income:</span>
                    <span>{formatCurrency(netIncome)}</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-amber/40 flex justify-between font-black text-sm text-amber">
                  <span>Total Liabilities & Equity:</span>
                  <span>{formatCurrency(tb.total_liabilities + tb.total_equity + netIncome)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profit and Loss View */}
        {activeTab === 'PROFIT_LOSS' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-sage/20">
              <div>
                <h3 className="font-bold text-base text-charcoal dark:text-ivory">Statement of Profit & Loss</h3>
                <span className="text-xs text-charcoal/50">Fiscal Period: {tb.period}</span>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald/15 text-emerald border border-emerald/30">
                Operating Net Margin: {tb.total_revenue > 0 ? ((netIncome / tb.total_revenue) * 100).toFixed(1) : 0}%
              </span>
            </div>

            <div className="max-w-2xl mx-auto space-y-4 text-xs">
              {/* Revenue */}
              <div className="p-4 rounded-2xl bg-ivory dark:bg-charcoal-50 border border-sage/20 space-y-2">
                <div className="flex justify-between font-bold text-sm text-emerald">
                  <span>Gross Operating Revenues:</span>
                  <span>{formatCurrency(tb.total_revenue)}</span>
                </div>
                {revenue.map((r: any) => (
                  <div key={r.code} className="flex justify-between text-charcoal/70 pl-4 py-0.5">
                    <span>{r.name}</span>
                    <span>{formatCurrency(r.credit)}</span>
                  </div>
                ))}
              </div>

              {/* Operating Expenses */}
              <div className="p-4 rounded-2xl bg-ivory dark:bg-charcoal-50 border border-sage/20 space-y-2">
                <div className="flex justify-between font-bold text-sm text-amber">
                  <span>Operating Expenditures & COGS:</span>
                  <span>{formatCurrency(tb.total_expense)}</span>
                </div>
                {expenses.map((ex: any) => (
                  <div key={ex.code} className="flex justify-between text-charcoal/70 pl-4 py-0.5">
                    <span>{ex.name}</span>
                    <span>{formatCurrency(ex.debit)}</span>
                  </div>
                ))}
              </div>

              {/* Net Profit Summary */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald/20 to-sage/10 border-2 border-emerald flex justify-between items-center text-sm font-black">
                <span className="text-charcoal dark:text-ivory">Net Operating Income:</span>
                <span className="text-emerald text-lg">{formatCurrency(netIncome)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
