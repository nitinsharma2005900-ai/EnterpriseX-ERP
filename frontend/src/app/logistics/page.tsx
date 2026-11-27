'use client';

import React, { useEffect, useState } from 'react';
import { Truck, Plus, CheckCircle, AlertCircle, Printer, Eye, PackageCheck } from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { StatusBadge } from '../../components/StatusBadge';

export default function LogisticsPage() {
  const [goodsReceipts, setGoodsReceipts] = useState<any[]>([]);
  const [approvedPOs, setApprovedPOs] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedPOId, setSelectedPOId] = useState('');
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [carrier, setCarrier] = useState('Midwest Freight Lines');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchApi('/logistics/goods-receipts'),
      fetchApi('/procurement/purchase-orders?status=APPROVED'),
      fetchApi('/inventory/warehouses'),
    ])
      .then(([grnRes, poRes, whRes]) => {
        if (grnRes.success) setGoodsReceipts(grnRes.data);
        if (poRes.success) setApprovedPOs(poRes.data);
        if (whRes.success) {
          setWarehouses(whRes.data);
          if (whRes.data.length > 0) setTargetWarehouseId(whRes.data[0].id);
        }
      })
      .catch((err) => setErrorMsg(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReceiveGoods = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const selectedPO = approvedPOs.find((p) => p.id === selectedPOId);
      if (!selectedPO) throw new Error('Please select an approved PO');

      const itemsPayload = selectedPO.items.map((i: any) => ({
        poItemId: i.id,
        productId: i.productId,
        quantityReceived: i.quantityOrdered - (i.quantityReceived || 0),
        quantityAccepted: i.quantityOrdered - (i.quantityReceived || 0),
        unitCost: i.unitPrice,
        batchNumber: `BATCH-${Date.now().toString().slice(-6)}`,
      }));

      const res = await fetchApi('/logistics/goods-receipts', {
        method: 'POST',
        body: JSON.stringify({
          poId: selectedPOId,
          warehouseId: targetWarehouseId,
          carrier,
          trackingNumber: trackingNumber || `TRK-${Math.floor(100000 + Math.random() * 900000)}`,
          items: itemsPayload,
        }),
      });

      if (res.success) {
        setSuccessMsg(`Goods Receipt Note ${res.data.grnNumber} issued! Inventory updated.`);
        setReceiveModalOpen(false);
        setSelectedPOId('');
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
          <span className="text-xs font-bold text-emerald uppercase tracking-wider">Logistics & Receiving</span>
          <h1 className="text-2xl font-black text-charcoal dark:text-ivory mt-0.5">
            Goods Receipt Notes (GRN)
          </h1>
          <p className="text-xs text-charcoal/60 dark:text-ivory/60 mt-1">
            Physical cargo inspection, warehouse bin placement, and automated inventory ledger integration.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setReceiveModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald hover:bg-emerald-600 text-ivory text-xs font-bold shadow-md transition active:scale-95 self-start"
        >
          <PackageCheck size={16} />
          <span>Receive Inbound Shipment</span>
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

      {/* GRN Table */}
      <div className="bg-ivory-50 dark:bg-charcoal rounded-3xl border border-sage/30 dark:border-charcoal-50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-sage/20 bg-sage/5 dark:bg-charcoal-50 text-charcoal/60 dark:text-ivory/60 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 font-bold">GRN Number</th>
                <th className="py-3 px-4 font-bold">PO Reference</th>
                <th className="py-3 px-4 font-bold">Supplier</th>
                <th className="py-3 px-4 font-bold">Warehouse</th>
                <th className="py-3 px-4 font-bold">Carrier / Tracking</th>
                <th className="py-3 px-4 font-bold">Received Date</th>
                <th className="py-3 px-4 font-bold text-center">Status</th>
                <th className="py-3 px-4 font-bold text-center">Print GRN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/10">
              {goodsReceipts.map((grn) => (
                <tr key={grn.id} className="hover:bg-sage/10 transition">
                  <td className="py-3 px-4 font-mono font-bold text-charcoal dark:text-ivory">{grn.grnNumber}</td>
                  <td className="py-3 px-4 font-semibold text-emerald">{grn.purchaseOrder?.poNumber}</td>
                  <td className="py-3 px-4 text-charcoal/90 dark:text-ivory/90 font-medium">
                    {grn.purchaseOrder?.vendor?.name}
                  </td>
                  <td className="py-3 px-4 text-charcoal/60">{grn.warehouse?.code}</td>
                  <td className="py-3 px-4 text-charcoal/60 font-mono text-[11px]">
                    {grn.carrier} ({grn.trackingNumber || 'N/A'})
                  </td>
                  <td className="py-3 px-4 text-charcoal/60">{formatDate(grn.receivedDate)}</td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={grn.status} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <a
                      href={`http://localhost:5000/api/documents/grn/${grn.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 inline-flex rounded-lg text-charcoal/60 hover:bg-sage/20 transition"
                      title="Print / View GRN PDF"
                    >
                      <Printer size={15} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receive Shipment Modal */}
      {receiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-ivory-50 dark:bg-charcoal border border-sage/40 dark:border-charcoal-50 shadow-2xl p-6">
            <h3 className="text-base font-bold text-charcoal dark:text-ivory mb-1">Inbound Goods Receipt (GRN)</h3>
            <p className="text-xs text-charcoal/60 dark:text-ivory/60 mb-4">
              Inspect delivery against approved purchase order and increment warehouse ledger.
            </p>

            <form onSubmit={handleReceiveGoods} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-charcoal/80 dark:text-ivory/80 uppercase mb-1">
                  Select Approved Purchase Order
                </label>
                <select
                  required
                  value={selectedPOId}
                  onChange={(e) => setSelectedPOId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-sage/40 dark:border-charcoal-100 bg-ivory dark:bg-charcoal text-xs font-semibold"
                >
                  <option value="">-- Choose Approved PO --</option>
                  {approvedPOs.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.poNumber} - {po.vendor?.name} (${po.totalAmount})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal/80 dark:text-ivory/80 uppercase mb-1">
                  Destination Warehouse
                </label>
                <select
                  required
                  value={targetWarehouseId}
                  onChange={(e) => setTargetWarehouseId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-sage/40 dark:border-charcoal-100 bg-ivory dark:bg-charcoal text-xs"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-charcoal/80 dark:text-ivory/80 uppercase mb-1">
                    Logistics Carrier
                  </label>
                  <input
                    type="text"
                    required
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="w-full p-2 rounded-xl border border-sage/40 dark:border-charcoal-100 bg-ivory dark:bg-charcoal text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-charcoal/80 dark:text-ivory/80 uppercase mb-1">
                    Waybill / Tracking #
                  </label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="TRK-9928172"
                    className="w-full p-2 rounded-xl border border-sage/40 dark:border-charcoal-100 bg-ivory dark:bg-charcoal text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-sage/20">
                <button
                  type="button"
                  onClick={() => setReceiveModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-charcoal/60 hover:bg-sage/15"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald hover:bg-emerald-600 text-ivory text-xs font-bold shadow-md"
                >
                  Post Goods Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
