'use client';

import React, { useEffect, useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Filter,
  FileText,
  Printer,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Trash2,
} from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';

export default function ProcurementPage() {
  const { user } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New PO Form state
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [selectedDepId, setSelectedDepId] = useState('');
  const [lineItems, setLineItems] = useState<Array<{ productId: string; quantity: number; unitPrice: number }>>([
    { productId: '', quantity: 1, unitPrice: 0 },
  ]);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchApi('/procurement/purchase-orders'),
      fetchApi('/vendors'),
      fetchApi('/inventory/products'),
    ])
      .then(([poRes, vRes, pRes]) => {
        if (poRes.success) setPurchaseOrders(poRes.data);
        if (vRes.success) setVendors(vRes.data);
        if (pRes.success) setProducts(pRes.data);
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
    updated[index].unitPrice = prod ? prod.standardCost : 0;
    setLineItems(updated);
  };

  const handleQtyChange = (index: number, qty: number) => {
    const updated = [...lineItems];
    updated[index].quantity = qty;
    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { productId: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const res = await fetchApi('/procurement/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({
          vendorId: selectedVendorId,
          departmentId: selectedDepId || undefined,
          items: lineItems.map((i) => ({
            productId: i.productId,
            quantityOrdered: i.quantity,
            unitPrice: i.unitPrice,
          })),
        }),
      });

      if (res.success) {
        setSuccessMsg(`Purchase Order ${res.data.poNumber} created successfully!`);
        setCreateModalOpen(false);
        setLineItems([{ productId: '', quantity: 1, unitPrice: 0 }]);
        loadData();
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleApprovePO = async (poId: string) => {
    setErrorMsg(null);
    try {
      const res = await fetchApi(`/procurement/purchase-orders/${poId}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({ comments: `Approved by ${user?.fullName}` }),
      });
      if (res.success) {
        setSuccessMsg(`PO approved successfully!`);
        setSelectedPO(null);
        loadData();
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleRejectPO = async (poId: string) => {
    setErrorMsg(null);
    try {
      const res = await fetchApi(`/procurement/purchase-orders/${poId}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ comments: `Rejected by ${user?.fullName}` }),
      });
      if (res.success) {
        setSuccessMsg(`PO rejected.`);
        setSelectedPO(null);
        loadData();
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald uppercase tracking-wider">Procurement Module</span>
          <h1 className="text-2xl font-black text-charcoal dark:text-ivory mt-0.5">
            Purchase Orders & Approvals
          </h1>
          <p className="text-xs text-charcoal/60 dark:text-ivory/60 mt-1">
            Supplier requisitions, approval workflow controls, and goods receipt coordination.
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
          <span>Create Purchase Order</span>
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

      {/* Purchase Orders Table */}
      <div className="bg-ivory-50 dark:bg-charcoal rounded-3xl border border-sage/30 dark:border-charcoal-50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-sage/20 bg-sage/5 dark:bg-charcoal-50 text-charcoal/60 dark:text-ivory/60 uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4 font-bold">PO Number</th>
                <th className="py-3.5 px-4 font-bold">Vendor</th>
                <th className="py-3.5 px-4 font-bold">Department</th>
                <th className="py-3.5 px-4 font-bold">Date</th>
                <th className="py-3.5 px-4 font-bold text-right">Total Amount</th>
                <th className="py-3.5 px-4 font-bold text-center">Status</th>
                <th className="py-3.5 px-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/10">
              {purchaseOrders.map((po) => (
                <tr key={po.id} className="hover:bg-sage/10 transition">
                  <td className="py-3.5 px-4 font-bold text-charcoal dark:text-ivory">{po.poNumber}</td>
                  <td className="py-3.5 px-4 text-charcoal/90 dark:text-ivory/90 font-medium">{po.vendor?.name}</td>
                  <td className="py-3.5 px-4 text-charcoal/60 dark:text-ivory/60">{po.department?.name || 'General'}</td>
                  <td className="py-3.5 px-4 text-charcoal/60 dark:text-ivory/60">{formatDate(po.createdAt)}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-charcoal dark:text-ivory">
                    {formatCurrency(po.totalAmount)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <StatusBadge status={po.status} />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setSelectedPO(po)}
                        className="p-1.5 rounded-lg text-emerald hover:bg-emerald/10 transition"
                        title="View Details & Authorize"
                      >
                        <Eye size={15} />
                      </button>
                      <a
                        href={`http://localhost:5000/api/documents/po/${po.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-charcoal/60 dark:text-ivory/60 hover:bg-sage/20 transition"
                        title="Print / View Official PDF"
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

      {/* Create PO Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-ivory-50 dark:bg-charcoal border border-sage/40 dark:border-charcoal-50 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-charcoal dark:text-ivory mb-1">Create New Purchase Order</h2>
            <p className="text-xs text-charcoal/60 dark:text-ivory/60 mb-4">
              Authorized procurement requisition subject to multi-tier approval limits.
            </p>

            <form onSubmit={handleCreatePO} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-charcoal/80 dark:text-ivory/80 uppercase mb-1">
                  Select Supplier / Vendor
                </label>
                <select
                  required
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-sage/40 dark:border-charcoal-100 bg-ivory dark:bg-charcoal text-xs font-medium"
                >
                  <option value="">-- Choose Vendor --</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.code}) - Terms: {v.paymentTerms}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Line Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-charcoal/80 dark:text-ivory/80 uppercase">
                    Order Line Items
                  </label>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="text-xs font-bold text-emerald flex items-center gap-1 hover:underline"
                  >
                    <Plus size={14} /> Add Line
                  </button>
                </div>

                {lineItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-sage/10 dark:bg-charcoal-50">
                    <select
                      required
                      value={item.productId}
                      onChange={(e) => handleProductSelect(idx, e.target.value)}
                      className="flex-1 p-2 rounded-lg border border-sage/30 dark:border-charcoal-100 bg-ivory dark:bg-charcoal text-xs"
                    >
                      <option value="">-- Select Product / SKU --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) - Standard Cost: ${p.standardCost}
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
                      placeholder="Qty"
                    />

                    <span className="w-24 text-right text-xs font-bold text-charcoal dark:text-ivory">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </span>

                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(idx)}
                        className="p-1 text-amber hover:text-amber-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-ivory dark:bg-charcoal border border-sage/20 flex items-center justify-between text-xs">
                <span>Estimated Subtotal (Net):</span>
                <span className="font-bold text-sm text-charcoal dark:text-ivory">
                  {formatCurrency(calculateSubtotal())}
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-sage/20">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-charcoal/70 hover:bg-sage/15"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald hover:bg-emerald-600 text-ivory text-xs font-bold shadow-md"
                >
                  Submit Requisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PO View & Approval Drawer */}
      {selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-3xl bg-ivory-50 dark:bg-charcoal border border-sage/40 dark:border-charcoal-50 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-sage/20">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald">Requisition Details</span>
                <h3 className="text-lg font-black text-charcoal dark:text-ivory">{selectedPO.poNumber}</h3>
              </div>
              <StatusBadge status={selectedPO.status} />
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-charcoal/50 dark:text-ivory/50 block">Vendor</span>
                  <span className="font-bold text-charcoal dark:text-ivory">{selectedPO.vendor?.name}</span>
                </div>
                <div>
                  <span className="text-charcoal/50 dark:text-ivory/50 block">Department</span>
                  <span className="font-bold text-charcoal dark:text-ivory">{selectedPO.department?.name || 'General'}</span>
                </div>
                <div>
                  <span className="text-charcoal/50 dark:text-ivory/50 block">Order Date</span>
                  <span className="font-bold text-charcoal dark:text-ivory">{formatDate(selectedPO.createdAt)}</span>
                </div>
                <div>
                  <span className="text-charcoal/50 dark:text-ivory/50 block">Total Amount (Inc. Tax)</span>
                  <span className="font-bold text-emerald text-sm">{formatCurrency(selectedPO.totalAmount)}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-sage/20">
                <span className="font-bold text-charcoal/70 dark:text-ivory/70 block mb-2">Line Items</span>
                <div className="space-y-1">
                  {selectedPO.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between py-1 border-b border-sage/10 text-xs">
                      <span>{item.product?.name} (x{item.quantityOrdered})</span>
                      <span className="font-semibold">{formatCurrency(item.totalAmount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-sage/20">
              <button
                onClick={() => setSelectedPO(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-charcoal/60 hover:bg-sage/15"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {selectedPO.status === 'PENDING_APPROVAL' && (
                  <>
                    <button
                      onClick={() => handleRejectPO(selectedPO.id)}
                      className="px-4 py-2 rounded-xl bg-charcoal-50 hover:bg-charcoal text-amber text-xs font-bold border border-amber/30"
                    >
                      Reject Requisition
                    </button>
                    <button
                      onClick={() => handleApprovePO(selectedPO.id)}
                      className="px-5 py-2 rounded-xl bg-emerald hover:bg-emerald-600 text-ivory text-xs font-bold shadow-md"
                    >
                      Authorize & Approve
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
