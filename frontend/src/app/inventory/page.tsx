'use client';

import React, { useEffect, useState } from 'react';
import {
  Package,
  Plus,
  Warehouse,
  ArrowRightLeft,
  SlidersHorizontal,
  AlertTriangle,
  History,
  CheckCircle,
} from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { StatusBadge } from '../../components/StatusBadge';

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Stock Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [qtyDelta, setQtyDelta] = useState(0);
  const [adjustNotes, setAdjustNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchApi('/inventory/products'),
      fetchApi('/inventory/warehouses'),
      fetchApi('/inventory/stock-movements'),
    ])
      .then(([prodRes, whRes, movRes]) => {
        if (prodRes.success) setProducts(prodRes.data);
        if (whRes.success) setWarehouses(whRes.data);
        if (movRes.success) setMovements(movRes.data);
      })
      .catch((err) => setErrorMsg(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const res = await fetchApi('/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          productId: selectedProductId,
          warehouseId: selectedWarehouseId,
          quantityDelta: Number(qtyDelta),
          notes: adjustNotes,
        }),
      });

      if (res.success) {
        setSuccessMsg('Stock adjustment recorded and movement audit logged successfully!');
        setAdjustModalOpen(false);
        setQtyDelta(0);
        setAdjustNotes('');
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
          <span className="text-xs font-bold text-emerald uppercase tracking-wider">Inventory & Supply Chain</span>
          <h1 className="text-2xl font-black text-charcoal dark:text-ivory mt-0.5">
            SKUs, Stock Ledger & Warehouses
          </h1>
          <p className="text-xs text-charcoal/60 dark:text-ivory/60 mt-1">
            Real-time physical inventory valuation, bin locations, and automated audit movements.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setAdjustModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald hover:bg-emerald-600 text-ivory text-xs font-bold shadow-md transition active:scale-95 self-start"
        >
          <SlidersHorizontal size={16} />
          <span>Physical Stock Adjustment</span>
        </button>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-amber/15 border border-amber/30 text-amber text-xs font-semibold flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald/15 border border-emerald/30 text-emerald text-xs font-semibold flex items-center gap-2">
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Warehouses Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {warehouses.map((wh) => (
          <div key={wh.id} className="p-5 rounded-3xl bg-ivory-50 dark:bg-charcoal border border-sage/30 dark:border-charcoal-50 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald/15 text-emerald flex items-center justify-center font-bold">
                <Warehouse size={22} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-charcoal dark:text-ivory">{wh.name}</h3>
                <p className="text-xs text-charcoal/60 dark:text-ivory/60">{wh.code} • {wh.location}</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald/15 text-emerald font-bold text-xs">
              Operational
            </span>
          </div>
        ))}
      </div>

      {/* Products & SKU Table */}
      <div className="bg-ivory-50 dark:bg-charcoal rounded-3xl border border-sage/30 dark:border-charcoal-50 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-sage/20 flex items-center justify-between">
          <h3 className="font-bold text-sm text-charcoal dark:text-ivory">Master Product Catalogue</h3>
          <span className="text-xs text-emerald font-semibold">{products.length} Active SKUs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-sage/20 bg-sage/5 dark:bg-charcoal-50 text-charcoal/60 dark:text-ivory/60 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 font-bold">SKU Code</th>
                <th className="py-3 px-4 font-bold">Product Name</th>
                <th className="py-3 px-4 font-bold">Category</th>
                <th className="py-3 px-4 font-bold text-right">Standard Cost</th>
                <th className="py-3 px-4 font-bold text-right">Selling Price</th>
                <th className="py-3 px-4 font-bold text-center">On Hand (CDC / WCL)</th>
                <th className="py-3 px-4 font-bold text-center">Reorder Point</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/10">
              {products.map((p) => {
                const cdcStock = p.stockLevels?.find((s: any) => s.warehouse?.code === 'WH-CDC-01')?.quantityOnHand || 0;
                const wclStock = p.stockLevels?.find((s: any) => s.warehouse?.code === 'WH-WCL-02')?.quantityOnHand || 0;
                const totalStock = cdcStock + wclStock;

                return (
                  <tr key={p.id} className="hover:bg-sage/10 transition">
                    <td className="py-3 px-4 font-mono font-bold text-charcoal dark:text-ivory">{p.sku}</td>
                    <td className="py-3 px-4 font-semibold text-charcoal dark:text-ivory">{p.name}</td>
                    <td className="py-3 px-4 text-charcoal/60 dark:text-ivory/60">{p.category}</td>
                    <td className="py-3 px-4 text-right font-semibold">{formatCurrency(p.standardCost)}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald">{formatCurrency(p.unitPrice)}</td>
                    <td className="py-3 px-4 text-center font-bold">
                      <span className="text-emerald">{cdcStock}</span> / <span className="text-amber">{wclStock}</span> {p.uom}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${totalStock <= p.reorderPoint ? 'bg-amber/20 text-amber' : 'bg-sage/20 text-charcoal/70'}`}>
                        {p.reorderPoint} {p.uom}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Movement Ledger Table */}
      <div className="bg-ivory-50 dark:bg-charcoal rounded-3xl border border-sage/30 dark:border-charcoal-50 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-sage/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={16} className="text-emerald" />
            <h3 className="font-bold text-sm text-charcoal dark:text-ivory">Recent Stock Ledger Movements</h3>
          </div>
          <span className="text-xs text-charcoal/50">Immutable Audit Trail</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-sage/20 bg-sage/5 dark:bg-charcoal-50 text-charcoal/60 dark:text-ivory/60 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4 font-bold">Movement #</th>
                <th className="py-2.5 px-4 font-bold">Date</th>
                <th className="py-2.5 px-4 font-bold">Product</th>
                <th className="py-2.5 px-4 font-bold">Warehouse</th>
                <th className="py-2.5 px-4 font-bold">Type</th>
                <th className="py-2.5 px-4 font-bold text-right">Quantity</th>
                <th className="py-2.5 px-4 font-bold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/10">
              {movements.slice(0, 8).map((m) => (
                <tr key={m.id} className="hover:bg-sage/10 transition">
                  <td className="py-2.5 px-4 font-mono font-bold text-charcoal dark:text-ivory">{m.movementNumber}</td>
                  <td className="py-2.5 px-4 text-charcoal/60">{formatDate(m.date)}</td>
                  <td className="py-2.5 px-4 font-medium">{m.product?.name}</td>
                  <td className="py-2.5 px-4 text-charcoal/60">{m.warehouse?.code}</td>
                  <td className="py-2.5 px-4">
                    <span className="font-bold text-[10px] text-emerald">{m.type}</span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold">
                    <span className={m.quantity > 0 ? 'text-emerald' : 'text-amber'}>
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-charcoal/50 text-[11px] truncate max-w-xs">{m.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Stock Modal */}
      {adjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-ivory-50 dark:bg-charcoal border border-sage/40 dark:border-charcoal-50 shadow-2xl p-6">
            <h3 className="text-base font-bold text-charcoal dark:text-ivory mb-1">Stock Level Adjustment</h3>
            <p className="text-xs text-charcoal/60 dark:text-ivory/60 mb-4">
              Physical inventory cycle recount. System strictly enforces non-negative stock invariants.
            </p>

            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-charcoal/80 dark:text-ivory/80 uppercase mb-1">
                  Product / SKU
                </label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-sage/40 dark:border-charcoal-100 bg-ivory dark:bg-charcoal text-xs"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal/80 dark:text-ivory/80 uppercase mb-1">
                  Target Warehouse
                </label>
                <select
                  required
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-sage/40 dark:border-charcoal-100 bg-ivory dark:bg-charcoal text-xs"
                >
                  <option value="">-- Choose Warehouse --</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal/80 dark:text-ivory/80 uppercase mb-1">
                  Quantity Adjustment Delta (Positive or Negative)
                </label>
                <input
                  type="number"
                  required
                  value={qtyDelta}
                  onChange={(e) => setQtyDelta(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-sage/40 dark:border-charcoal-100 bg-ivory dark:bg-charcoal text-xs font-bold"
                  placeholder="e.g. +10 or -5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal/80 dark:text-ivory/80 uppercase mb-1">
                  Adjustment Reason & Audit Notes
                </label>
                <input
                  type="text"
                  required
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-sage/40 dark:border-charcoal-100 bg-ivory dark:bg-charcoal text-xs"
                  placeholder="e.g. Q1 physical bin count variance correction"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-sage/20">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-charcoal/60 hover:bg-sage/15"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald hover:bg-emerald-600 text-ivory text-xs font-bold shadow-md"
                >
                  Post Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
