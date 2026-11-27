'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Filter, RefreshCw, Eye, ArrowRight } from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { StatusBadge } from '../../components/StatusBadge';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    let url = '/audit?';
    if (selectedAction) url += `action=${selectedAction}&`;
    if (selectedEntity) url += `entityType=${selectedEntity}&`;

    fetchApi(url)
      .then((res) => {
        if (res.success) setLogs(res.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [selectedAction, selectedEntity]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald uppercase tracking-wider">Assessment 04: Security & Governance</span>
          <h1 className="text-2xl font-black text-charcoal dark:text-ivory mt-0.5">
            Immutable Audit Trail
          </h1>
          <p className="text-xs text-charcoal/60 dark:text-ivory/60 mt-1">
            Tamper-evident system activity log capturing user actions, before/after states, and security events.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 self-start text-xs">
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="p-2 rounded-xl border border-sage/30 bg-ivory-50 dark:bg-charcoal text-xs font-semibold"
          >
            <option value="">All Actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="CREATE">CREATE</option>
            <option value="APPROVE">APPROVE</option>
            <option value="POST">POST</option>
            <option value="INCIDENT_RESOLVE">INCIDENT_RESOLVE</option>
          </select>

          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="p-2 rounded-xl border border-sage/30 bg-ivory-50 dark:bg-charcoal text-xs font-semibold"
          >
            <option value="">All Entities</option>
            <option value="PO">Purchase Order (PO)</option>
            <option value="GRN">Goods Receipt (GRN)</option>
            <option value="INVOICE">Invoice</option>
            <option value="PAYMENT">Payment</option>
            <option value="JOURNAL">Journal</option>
            <option value="USER">User</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-ivory-50 dark:bg-charcoal rounded-3xl border border-sage/30 dark:border-charcoal-50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-sage/20 bg-sage/5 dark:bg-charcoal-50 text-charcoal/60 dark:text-ivory/60 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 font-bold">Timestamp</th>
                <th className="py-3 px-4 font-bold">User / Actor</th>
                <th className="py-3 px-4 font-bold">Action</th>
                <th className="py-3 px-4 font-bold">Entity Type</th>
                <th className="py-3 px-4 font-bold">Entity ID</th>
                <th className="py-3 px-4 font-bold text-center">Status</th>
                <th className="py-3 px-4 font-bold text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/10">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-sage/10 transition">
                  <td className="py-2.5 px-4 font-mono text-[11px] text-charcoal/60">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 font-bold text-charcoal dark:text-ivory">
                    {log.user?.fullName || log.userEmail || 'System'}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="font-mono font-bold text-[10px] text-emerald">{log.action}</span>
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-charcoal/70 dark:text-ivory/70">{log.entityType}</td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-charcoal/50 truncate max-w-xs">{log.entityId || '-'}</td>
                  <td className="py-2.5 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${log.success ? 'bg-emerald/15 text-emerald' : 'bg-amber/15 text-amber'}`}>
                      {log.success ? 'SUCCESS' : 'FAILED'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="p-1 rounded text-emerald hover:bg-emerald/10 transition"
                      title="Inspect State Payload"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* State Inspector Drawer */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-3xl bg-ivory-50 dark:bg-charcoal border border-sage/40 dark:border-charcoal-50 shadow-2xl p-6">
            <h3 className="text-base font-bold text-charcoal dark:text-ivory mb-1">
              Audit Event State Payload
            </h3>
            <p className="text-xs text-charcoal/60 dark:text-ivory/60 mb-4">
              Cryptographically captured event details for reference: {selectedLog.id}
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-ivory dark:bg-charcoal-50 border border-sage/20 space-y-1">
                <div className="flex justify-between">
                  <span className="text-charcoal/50">Actor:</span>
                  <span className="font-bold">{selectedLog.userEmail || 'System'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-charcoal/50">Request ID:</span>
                  <span className="font-mono text-[10px]">{selectedLog.requestId || 'Internal'}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-charcoal/70 uppercase text-[10px] block mb-1">State Transition Payload</span>
                <pre className="p-3 rounded-2xl bg-charcoal text-ivory font-mono text-[11px] overflow-x-auto max-h-60">
                  {selectedLog.afterState || selectedLog.beforeState || '{"event": "Authorized transaction"}'}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-sage/20 mt-4">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald text-ivory hover:bg-emerald-600 transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
