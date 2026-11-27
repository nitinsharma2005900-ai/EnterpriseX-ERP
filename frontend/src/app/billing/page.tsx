'use client';

import React, { useEffect, useState } from 'react';
import {
  Receipt,
  Plus,
  CreditCard,
  Printer,
  CheckCircle,
  AlertCircle,
  Clock,
  ShieldCheck,
  FileCheck2,
} from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { StatusBadge } from '../../components/StatusBadge';

export default function BillingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACCOUNTS_PAYABLE' | 'ACCOUNTS_RECEIVABLE'>('ALL');
  const [loading, setLoading] = useState(true);

  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    fetchApi('/billing/invoices')
      .then((res) => {
        if (res.success) setInvoices(res.data);
      })
      .catch((err) => setErrorMsg(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const openPaymentModal = (inv: any) => {
    setSelectedInvoice(inv);
    setPaymentAmount(inv.remainingAmount || inv.totalAmount);
    setIdempotencyKey(`PAY-IDEMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
    setErrorMsg(null);
    setPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const res = await fetchApi('/billing/payments', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          amount: Number(paymentAmount),
          paymentMethod,
          idempotencyKey,
          notes: `Settlement via ${paymentMethod}`,
        }),
      });

      if (res.success) {
        setSuccessMsg(
          `Payment ${res.data.payment.paymentNumber} processed successfully! Balancing General Ledger journal entry posted automatically.`
        );
        setPaymentModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const filteredInvoices = invoices.filter((i) => {
    if (activeTab === 'ALL') return true;
    return i.type === activeTab;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald uppercase tracking-wider">Invoicing & Treasury</span>
          <h1 className="text-2xl font-black text-charcoal dark:text-ivory mt-0.5">
            Accounts Payable & Receivable
          </h1>
          <p className="text-xs text-charcoal/60 dark:text-ivory/60 mt-1">
            3-Way matched invoices, idempotent bank settlements, and automated General Ledger double-entry posting.
          </p>
        </div>

        {/* Tab Filter */}
        <div className="flex p-1 rounded-2xl bg-sage/15 dark:bg-charcoal border border-sage/30 self-start text-xs font-bold">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-xl transition ${activeTab === 'ALL' ? 'bg-emerald text-ivory shadow-sm' : 'text-charcoal/70 dark:text-ivory/70'}`}
          >
            All Invoices
          </button>
          <button
            onClick={() => setActiveTab('ACCOUNTS_PAYABLE')}
            className={`px-3 py-1.5 rounded-xl transition ${activeTab === 'ACCOUNTS_PAYABLE' ? 'bg-emerald text-ivory shadow-sm' : 'text-charcoal/70 dark:text-ivory/70'}`}
          >
            Payables (AP)
          </button>
          <button
            onClick={() => setActiveTab('ACCOUNTS_RECEIVABLE')}
            className={`px-3 py-1.5 rounded-xl transition ${activeTab === 'ACCOUNTS_RECEIVABLE' ? 'bg-emerald text-ivory shadow-sm' : 'text-charcoal/70 dark:text-ivory/70'}`}
          >
            Receivables (AR)
          </button>
        </div>
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

      {/* Invoices Table */}
      <div className="bg-ivory-50 dark:bg-charcoal rounded-3xl border border-sage/30 dark:border-charcoal-50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-sage/20 bg-sage/5 dark:bg-charcoal-50 text-charcoal/60 dark:text-ivory/60 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 font-bold">Invoice #</th>
                <th className="py-3 px-4 font-bold">Type</th>
                <th className="py-3 px-4 font-bold">Entity (Vendor / Customer)</th>
                <th className="py-3 px-4 font-bold">Due Date</th>
                <th className="py-3 px-4 font-bold text-center">3-Way Match</th>
                <th className="py-3 px-4 font-bold text-right">Total Amount</th>
                <th className="py-3 px-4 font-bold text-right">Balance Due</th>
                <th className="py-3 px-4 font-bold text-center">Status</th>
                <th className="py-3 px-4 font-bold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/10">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-sage/10 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-charcoal dark:text-ivory">{inv.invoiceNumber}</td>
                  <td className="py-3.5 px-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${inv.type === 'ACCOUNTS_PAYABLE' ? 'bg-amber/15 text-amber' : 'bg-emerald/15 text-emerald'}`}>
                      {inv.type === 'ACCOUNTS_PAYABLE' ? 'Vendor AP' : 'Customer AR'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-charcoal dark:text-ivory">
                    {inv.vendor?.name || inv.customer?.name}
                  </td>
                  <td className="py-3.5 px-4 text-charcoal/60">{formatDate(inv.dueDate)}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${inv.matchStatus === 'MATCHED' ? 'bg-emerald/15 text-emerald' : 'bg-amber/15 text-amber'}`}>
                      {inv.matchStatus || 'MATCHED'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-charcoal dark:text-ivory">{formatCurrency(inv.totalAmount)}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-amber">{formatCurrency(inv.remainingAmount)}</td>
                  <td className="py-3.5 px-4 text-center">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {inv.status !== 'PAID' && (
                        <button
                          onClick={() => openPaymentModal(inv)}
                          className="px-2.5 py-1 rounded-lg bg-emerald hover:bg-emerald-600 text-ivory font-bold text-[11px] shadow-sm transition"
                        >
                          Settle
                        </button>
                      )}
                      <a
                        href={`http://localhost:5000/api/documents/invoice/${inv.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-charcoal/60 hover:bg-sage/20 transition"
                        title="Print / View Invoice PDF"
                      >
                        <Printer size={15} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-ivory-50 dark:bg-charcoal border border-sage/40 dark:border-charcoal-50 shadow-2xl p-6">
            <h3 className="text-base font-bold text-charcoal dark:text-ivory mb-1">
              Record Treasury Settlement Payment
            </h3>
            <p className="text-xs text-charcoal/60 dark:text-ivory/60 mb-4">
              Idempotent payment execution with real-time General Ledger balanced journal entry.
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="p-3 rounded-2xl bg-sage/10 dark:bg-charcoal-50 border border-sage/20 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-charcoal/60 dark:text-ivory/60">Target Invoice:</span>
                  <span className="font-bold">{selectedInvoice?.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-charcoal/60 dark:text-ivory/60">Outstanding Balance:</span>
                  <span className="font-bold text-amber">{formatCurrency(selectedInvoice?.remainingAmount)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal/80 dark:text-ivory/80 uppercase mb-1">
                  Settlement Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedInvoice?.remainingAmount}
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-sage/40 dark:border-charcoal-100 bg-ivory dark:bg-charcoal text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal/80 dark:text-ivory/80 uppercase mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-sage/40 dark:border-charcoal-100 bg-ivory dark:bg-charcoal text-xs"
                >
                  <option value="BANK_TRANSFER">Bank Automated Wire / ACH</option>
                  <option value="CREDIT_CARD">Corporate Purchasing Card</option>
                  <option value="CHECK">Certified Bank Check</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal/80 dark:text-ivory/80 uppercase mb-1">
                  Idempotency Key (Prevents Duplicate Postings)
                </label>
                <input
                  type="text"
                  required
                  readOnly
                  value={idempotencyKey}
                  className="w-full p-2 rounded-xl border border-sage/30 bg-sage/10 text-xs font-mono text-charcoal/60"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-sage/20">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-charcoal/60 hover:bg-sage/15"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald hover:bg-emerald-600 text-ivory text-xs font-bold shadow-md"
                >
                  Execute Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
