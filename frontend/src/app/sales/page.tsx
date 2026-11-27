'use client';

import { useAuth } from '../../context/AuthContext';
import React, { useEffect, useState } from 'react';
import {
  BadgeDollarSign,
  Plus,
  BookmarkCheck,
  Truck,
  CheckCircle,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { StatusBadge } from '../../components/StatusBadge';

export default function SalesPage() {
  const { user } = useAuth();
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [lineItems, setLineItems] = useState<Array<{ productId: string; quantity: number; unitPrice: number }>>([
    { productId: '', quantity: 1, unitPrice: 0 },
  ]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchApi('/sales/sales-orders'),
      fetchApi('/customers'),
      fetchApi('/inventory/products'),
      fetchApi('/inventory/warehouses'),
    ])
      .then(([soRes, cRes, pRes, whRes]) => {
        if (soRes.success) setSalesOrders(soRes.data);
        if (cRes.success) setCustomers(cRes.data);
        if (pRes.success) setProducts(pRes.data);
        if (whRes.success) setWarehouses(whRes.data);
      })
      .catch((err) => setErrorMsg(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    const updated = [...lineItems];
    updated[index].productId = productId;
    updated[index].unitPrice = prod ? prod.unitPrice : 0;
    setLineItems(updated);
  };

  const handleQtyChange = (index: number, qty: number) => {
    const updated = [...lineItems];
    updated[index].quantity = qty;
    setLineItems(updated);
  };

  const handleCreateSO = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const res = await fetchApi('/sales/sales-orders', {
        method: 'POST',
        body: JSON.stringify({
          customerId: selectedCustomerId,
          items: lineItems.map((i) => ({
            productId: i.productId,
            quantityOrdered: i.quantity,
            unitPrice: i.unitPrice,
          })),
        }),
      });

      if (res.success) {
        setSuccessMsg(`Sales Order ${res.data.soNumber} booked!`);
        setCreateModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleReserveStock = async (soId: string) => {
    setErrorMsg(null);
    try {
      const whId = warehouses[0]?.id;
      const res = await fetchApi(`/sales/sales-orders/${soId}/reserve`, {
        method: 'POST',
        body: JSON.stringify({ warehouseId: whId }),
      });
      if (res.success) {
        setSuccessMsg('Warehouse stock reserved successfully!');
        loadData();
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleFulfillOrder = async (soId: string) => {
    setErrorMsg(null);
    try {
      const whId = warehouses[0]?.id;
      const res = await fetchApi(`/sales/sales-orders/${soId}/fulfill`, {
        method: 'POST',
        body: JSON.stringify({ warehouseId: whId }),
      });
      if (res.success) {
        setSuccessMsg('Order fulfilled and inventory deducted from warehouse!');
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
          <span className="text-xs font-bold text-emerald uppercase tracking-wider">Commercial Sales</span>
          <h1 className="text-2xl font-black text-charcoal dark:text-ivory mt-0.5">
            Sales Orders & Stock Reservation
          </h1>
          <p className="text-xs text-charcoal/60 dark:text-ivory/60 mt-1">
            Customer order booking, customer credit limit checks, inventory reservation, and dispatch fulfillment.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setCreateModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald hover:bg-emerald-600 text-ivory text-xs font-bold shadow-md transition active:scale-95 self-start"
        >
          <Plus size={16} />
          <span>New Sales Order</span>
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

      {/* Sales Orders Table */}
      <div className="bg-ivory-50 dark:bg-charcoal rounded-3xl border border-sage/30 dark:border-charcoal-50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-sage/20 bg-sage/5 dark:bg-charcoal-50 text-charcoal/60 dark:text-ivory/60 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 font-bold">SO Number</th>
                <th className="py-3 px-4 font-bold">Customer</th>
                <th className="py-3 px-4 font-bold">Date</th>
                <th className="py-3 px-4 font-bold text-right">Total Amount</th>
                <th className="py-3 px-4 font-bold text-center">Status</th>
                <th className="py-3 px-4 font-bold text-center">Fulfillment Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/10">
              {salesOrders.map((so) => (
                <tr key={so.id} className="hover:bg-sage/10 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-charcoal dark:text-ivory">{so.soNumber}</td>
                  <td className="py-3.5 px-4 font-semibold text-charcoal dark:text-ivory">{so.customer?.name}</td>
                  <td className="py-3.5 px-4 text-charcoal/60">{formatDate(so.createdAt)}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-emerald">{formatCurrency(so.totalAmount)}</td>
                  <td className="py-3.5 px-4 text-center">
                    <StatusBadge status={so.status} />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {so.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleReserveStock(so.id)}
                          className="px-2.5 py-1 rounded-lg bg-amber/15 text-amber hover:bg-amber/25 font-bold text-[11px] border border-amber/30 transition"
                        >
                          Reserve Stock
                        </button>
                      )}
                      {so.status === 'RESERVED' && ['ERP_ADMINISTRATOR','WAREHOUSE_OPERATOR'].includes(user?.role || '') && (
                        <button
                          onClick={() => handleFulfillOrder(so.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald hover:bg-emerald-600 text-ivory font-bold text-[11px] shadow-sm transition"
                        >
                          Fulfill & Ship
                        </button>
                      )}
                      {so.status === 'FULFILLED' && (
                        <span className="text-emerald text-[11px] font-bold">Ready for Invoice</span>
                      )}
                      {so.status === 'INVOICED' && (
                        <span className="text-charcoal/60 text-[11px] font-semibold">Completed</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New SO Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 backdrop-blur-sm p-4">
          <div className="w-full max-h-[90vh] overflow-y-auto max-w-xl rounded-3xl bg-ivory-50 dark:bg-charcoal border border-sage/40 dark:border-charcoal-50 shadow-2xl p-6">
            <h3 className="text-base font-bold text-charcoal dark:text-ivory mb-1">Book New Sales Order</h3>
            <p className="text-xs text-charcoal/60 dark:text-ivory/60 mb-4">
              Commercial agreement with automated customer credit threshold verification.
            </p>

            <form onSubmit={handleCreateSO} className="space-y-4">
              {errorMsg && <p role="alert" className="text-amber text-xs">{errorMsg}</p>}
              <div>
                <label className="block text-xs font-bold text-charcoal/80 dark:text-ivory/80 uppercase mb-1">
                  Customer Account
                </label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-sage/40 dark:border-charcoal-100 bg-ivory dark:bg-charcoal text-xs font-semibold"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code}) - Credit Limit: ${c.creditLimit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-charcoal/80 dark:text-ivory/80 uppercase block">
                  Items to Order
                </label>
                {lineItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-sage/10 dark:bg-charcoal-50">
                    <select
                      required
                      value={item.productId}
                      onChange={(e) => handleProductSelect(idx, e.target.value)}
                      className="flex-1 p-2 rounded-lg border border-sage/30 dark:border-charcoal-100 bg-ivory dark:bg-charcoal text-xs"
                    >
                      <option value="">-- Choose Product --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (${p.unitPrice})
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="1"
                      required
                      value={item.quantity}
                      onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                      className="w-20 p-2 rounded-lg border border-sage/30 dark:border-charcoal-100 bg-ivory dark:bg-charcoal text-xs text-center font-bold"
                    />

                    <span className="w-24 text-right text-xs font-bold text-charcoal dark:text-ivory">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-sage/20">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-charcoal/60 hover:bg-sage/15"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald hover:bg-emerald-600 text-ivory text-xs font-bold shadow-md"
                >
                  Confirm Sales Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
