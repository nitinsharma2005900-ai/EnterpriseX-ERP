'use client';

import React, { useState } from 'react';
import {
  GitFork,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

export default function WorkflowsPage() {
  const [running, setRunning] = useState(false);
  const [simulateFailureAt, setSimulateFailureAt] = useState<'NONE' | 'APPROVAL' | 'RECEIPT' | 'INVOICE' | 'PAYMENT'>('NONE');
  const [p2pResult, setP2PResult] = useState<any>(null);
  const [o2cResult, setO2CResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRunP2P = async () => {
    setRunning(true);
    setP2PResult(null);
    setErrorMsg(null);

    try {
      // 1. Fetch vendor, warehouse, product for the workflow run
      const [vendors, warehouses, products, me] = await Promise.all([
        fetchApi('/vendors'),
        fetchApi('/inventory/warehouses'),
        fetchApi('/inventory/products'),
        fetchApi('/auth/me'),
      ]);

      const vId = vendors.data[0].id;
      const whId = warehouses.data[0].id;
      const pId = products.data[0].id;
      const depId = me.data.department?.id || warehouses.data[0].branch?.organizationId;

      const res = await fetchApi('/workflows/purchase-to-pay', {
        method: 'POST',
        body: JSON.stringify({
          vendorId: vId,
          departmentId: depId,
          warehouseId: whId,
          items: [{ productId: pId, quantity: 2, unitPrice: products.data[0].standardCost }],
          simulateFailureAt,
          idempotencyKey: `WORKFLOW-P2P-${Date.now()}`,
        }),
      });

      if (res.success) {
        setP2PResult(res.data);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setRunning(false);
    }
  };

  const handleRunO2C = async () => {
    setRunning(true);
    setO2CResult(null);
    setErrorMsg(null);

    try {
      const [customers, warehouses, products] = await Promise.all([
        fetchApi('/customers'),
        fetchApi('/inventory/warehouses'),
        fetchApi('/inventory/products'),
      ]);

      const cId = customers.data[0].id;
      const whId = warehouses.data[0].id;
      const pId = products.data[0].id;

      const res = await fetchApi('/workflows/order-to-cash', {
        method: 'POST',
        body: JSON.stringify({
          customerId: cId,
          warehouseId: whId,
          items: [{ productId: pId, quantity: 1, unitPrice: products.data[0].unitPrice }],
          idempotencyKey: `WORKFLOW-O2C-${Date.now()}`,
        }),
      });

      if (res.success) {
        setO2CResult(res.data);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs font-bold text-emerald uppercase tracking-wider">Assessment 07 & Capstone Challenge</span>
        <h1 className="text-2xl font-black text-charcoal dark:text-ivory mt-0.5">
          Cross-Module Workflows & Incident Compensation
        </h1>
        <p className="text-xs text-charcoal/60 dark:text-ivory/60 mt-1">
          Automated end-to-end multi-service business pipelines with transactional boundaries, explicit state transitions, and safe compensation rollback.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-amber/15 border border-amber/30 text-amber text-xs font-semibold flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Purchase-to-Pay (P2P) Section */}
      <div className="p-6 rounded-3xl bg-ivory-50 dark:bg-charcoal border border-sage/30 dark:border-charcoal-50 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-sage/20">
          <div>
            <div className="flex items-center gap-2">
              <GitFork size={18} className="text-emerald" />
              <h3 className="font-bold text-base text-charcoal dark:text-ivory">Purchase-to-Pay (P2P) Pipeline</h3>
            </div>
            <p className="text-xs text-charcoal/60 dark:text-ivory/60 mt-0.5">
              Vendor → PO → Approval → Goods Receipt → Stock Increment → AP 3-Way Match → Settle Payment → GL Posting
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-charcoal/70 dark:text-ivory/70">Controlled Failure:</span>
              <select
                value={simulateFailureAt}
                onChange={(e) => setSimulateFailureAt(e.target.value as any)}
                className="p-2 rounded-xl border border-sage/30 bg-ivory dark:bg-charcoal text-xs font-bold text-amber"
              >
                <option value="NONE">Normal (No Failure)</option>
                <option value="APPROVAL">Simulate Failure at PO Approval</option>
                <option value="RECEIPT">Simulate Failure at Goods Receipt</option>
                <option value="INVOICE">Simulate Failure at 3-Way Matching</option>
                <option value="PAYMENT">Simulate Failure at Payment Settlement</option>
              </select>
            </div>

            <button
              onClick={handleRunP2P}
              disabled={running}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald hover:bg-emerald-600 text-ivory text-xs font-bold shadow-md transition active:scale-95 disabled:opacity-50"
            >
              <Play size={15} />
              <span>{running ? 'Executing Pipeline...' : 'Run P2P Pipeline'}</span>
            </button>
          </div>
        </div>

        {/* Live Trace Stepper */}
        {p2pResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-charcoal/60 dark:text-ivory/60">
                Pipeline Execution Trace
              </span>
              <span
                className={`px-3 py-0.5 rounded-full text-xs font-bold ${
                  p2pResult.status === 'COMPLETED'
                    ? 'bg-emerald/15 text-emerald border border-emerald/30'
                    : 'bg-amber/15 text-amber border border-amber/30'
                }`}
              >
                Status: {p2pResult.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
              {p2pResult.trace?.map((step: any, idx: number) => {
                const isSuccess = step.status === 'SUCCESS';
                const isComp = step.status === 'COMPENSATED';

                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border text-xs flex flex-col justify-between ${
                      isSuccess
                        ? 'bg-emerald/10 border-emerald/30 text-emerald'
                        : isComp
                        ? 'bg-amber/10 border-amber/30 text-amber'
                        : 'bg-charcoal/10 border-charcoal/20 text-charcoal/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[10px] font-bold">Step {idx + 1}</span>
                      {isSuccess ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    </div>
                    <p className="font-bold text-charcoal dark:text-ivory truncate">{step.step.replace(/_/g, ' ')}</p>
                    <span className="text-[10px] font-semibold mt-1">{step.status}</span>
                  </div>
                );
              })}
            </div>

            {/* Compensation Rollback Log (Capstone Challenge Evidence) */}
            {p2pResult.compensationLog && p2pResult.compensationLog.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber/10 border border-amber/30 space-y-2">
                <div className="flex items-center gap-2 text-amber font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck size={16} />
                  <span>Automated Safe Compensation Rollback Log (Domain-Specific Challenge)</span>
                </div>
                <div className="space-y-1 font-mono text-[11px] text-charcoal/80 dark:text-ivory/80">
                  {p2pResult.compensationLog.map((log: string, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <ArrowRight size={12} className="text-amber" />
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Order-to-Cash (O2C) Section */}
      <div className="p-6 rounded-3xl bg-ivory-50 dark:bg-charcoal border border-sage/30 dark:border-charcoal-50 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-sage/20">
          <div>
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-emerald" />
              <h3 className="font-bold text-base text-charcoal dark:text-ivory">Order-to-Cash (O2C) Pipeline</h3>
            </div>
            <p className="text-xs text-charcoal/60 dark:text-ivory/60 mt-0.5">
              Customer → Sales Order → Stock Reservation → Warehouse Fulfillment → AR Invoice → Receipt Settle
            </p>
          </div>

          <button
            onClick={handleRunO2C}
            disabled={running}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald hover:bg-emerald-600 text-ivory text-xs font-bold shadow-md transition active:scale-95 disabled:opacity-50 self-start"
          >
            <Play size={15} />
            <span>{running ? 'Executing Pipeline...' : 'Run O2C Pipeline'}</span>
          </button>
        </div>

        {o2cResult && (
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase text-emerald">
              O2C Workflow Completed Successfully!
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {o2cResult.trace?.map((step: any, idx: number) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-emerald/10 border border-emerald/30 text-emerald text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] font-bold">Step {idx + 1}</span>
                    <CheckCircle2 size={16} />
                  </div>
                  <p className="font-bold text-charcoal dark:text-ivory">{step.step.replace(/_/g, ' ')}</p>
                  <span className="text-[10px] font-semibold mt-1">SUCCESS</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
