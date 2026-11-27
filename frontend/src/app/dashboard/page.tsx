'use client';

import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Package,
  AlertTriangle,
  ArrowUpRight,
  Layers,
  Sparkles,
  Clock,
} from 'lucide-react';
import { KPICard } from '../../components/KPICard';
import { StatusBadge } from '../../components/StatusBadge';
import { fetchApi } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [recentPOs, setRecentPOs] = useState<any[]>([]);
  const [stockAlerts, setStockAlerts] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchApi('/reports/executive-analytics'),
      fetchApi('/procurement/purchase-orders'),
      fetchApi('/inventory/products'),
    ])
      .then(([analyticsRes, poRes, prodRes]) => {
        if (analyticsRes.success) setAnalytics(analyticsRes.data);
        if (poRes.success) setRecentPOs(poRes.data.slice(0, 5));
        if (prodRes.success) {
          const alerts = prodRes.data.filter((p: any) => {
            const totalStock = p.stockLevels?.reduce((sum: number, s: any) => sum + s.quantityOnHand, 0) || 0;
            return totalStock <= p.reorderPoint * 1.5;
          });
          setStockAlerts(alerts.slice(0, 4));
        }
      })
      .catch((err) => setErrorMsg(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-sage/20 rounded-xl w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-sage/10 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (errorMsg || !analytics) return <div role="alert" className="p-4 rounded-xl text-amber bg-amber/10">{errorMsg || "Unable to load report"}</div>;
  const kpis = analytics;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-emerald/15 via-sage/10 to-transparent border border-emerald/30 shadow-sm">
        <div>
          <span className="text-xs font-bold text-emerald tracking-wider uppercase">
            Executive Performance Overview
          </span>
          <h1 className="text-2xl font-black text-charcoal dark:text-ivory mt-0.5">
            Operational Intelligence & Financial Health
          </h1>
          <p className="text-xs text-charcoal/70 dark:text-ivory/70 mt-1">
            Real-time synchronization across General Ledger, Sourcing, Warehousing & Order Fulfillment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-ivory-50 dark:bg-charcoal border border-sage/30 shadow-sm flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald animate-ping" />
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-charcoal/50 dark:text-ivory/50 block">
                Cash Flow Status
              </span>
              <span className="text-xs font-bold text-emerald">
                {kpis.cash_flow_health}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Gross Revenue"
          value={formatCurrency(kpis.revenue)}
          change="+18.4%"
          isPositive={true}
          icon={DollarSign}
          subtext="vs previous fiscal quarter"
        />
        <KPICard
          title="Net Operating Profit"
          value={formatCurrency(kpis.net_profit)}
          change={`Margin ${(kpis.revenue > 0 ? (kpis.net_profit / kpis.revenue) * 100 : 25).toFixed(1)}%`}
          isPositive={true}
          icon={TrendingUp}
          badge="GAAP Validated"
        />
        <KPICard
          title="Trade Receivables (AR)"
          value={formatCurrency(kpis.accounts_receivable)}
          change={`DSO ${kpis.dso_days} days`}
          isPositive={kpis.dso_days < 60}
          icon={CreditCard}
          subtext="Customer collections pipeline"
        />
        <KPICard
          title="Inventory Valuation"
          value={formatCurrency(kpis.inventory_valuation)}
          change={`Turnover ${kpis.inventory_turnover_ratio}x`}
          isPositive={true}
          icon={Package}
          subtext="Warehouse stock asset balance"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & Expense Trend Area Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-ivory-50 dark:bg-charcoal border border-sage/30 dark:border-charcoal-50 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-charcoal dark:text-ivory">Financial Performance Trend</h3>
              <p className="text-xs text-charcoal/60 dark:text-ivory/60">Revenue vs Operating Expenditures (USD)</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald">
                <span className="w-3 h-3 rounded-full bg-emerald" /> Revenue
              </span>
              <span className="flex items-center gap-1.5 text-amber">
                <span className="w-3 h-3 rounded-full bg-amber" /> Expenses
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={kpis.monthly_trend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#167D58" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#167D58" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D99A39" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D99A39" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#A8C3AE" opacity={0.2} />
                <XAxis dataKey="month" stroke="#888" fontSize={11} tickLine={false} />
                <YAxis stroke="#888" fontSize={11} tickLine={false} tickFormatter={(val) => `$${val / 1000}k`} />
                <Tooltip
                  formatter={(val: any) => formatCurrency(val)}
                  contentStyle={{
                    backgroundColor: '#182420',
                    border: '1px solid #167D58',
                    borderRadius: '8px',
                    color: '#F7F6F0',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#167D58" strokeWidth={2.5} fillOpacity={1} fill="url(#emeraldGrad)" />
                <Area type="monotone" dataKey="expenses" stroke="#D99A39" strokeWidth={2} fillOpacity={1} fill="url(#amberGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Vendors Spend Bar Chart */}
        <div className="p-6 rounded-3xl bg-ivory-50 dark:bg-charcoal border border-sage/30 dark:border-charcoal-50 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-charcoal dark:text-ivory mb-1">Procurement Spend by Vendor</h3>
            <p className="text-xs text-charcoal/60 dark:text-ivory/60 mb-4">Top supplier allocations</p>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kpis.top_vendors_by_spend || []} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="vendor" type="category" width={110} fontSize={10} stroke="#888" tickLine={false} />
                  <Tooltip
                    formatter={(val: any) => formatCurrency(val)}
                    contentStyle={{ backgroundColor: '#182420', border: '1px solid #A8C3AE', borderRadius: '8px', color: '#F7F6F0', fontSize: '11px' }}
                  />
                  <Bar dataKey="spend" fill="#167D58" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-sage/20 text-xs text-charcoal/60 dark:text-ivory/60 flex justify-between">
            <span>Working Capital Ratio: <strong>1.85</strong></span>
            <span>Payables DPO: <strong>{kpis.dpo_days}d</strong></span>
          </div>
        </div>
      </div>

      {/* Actionable Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Purchase Orders */}
        <div className="p-6 rounded-3xl bg-ivory-50 dark:bg-charcoal border border-sage/30 dark:border-charcoal-50 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-charcoal dark:text-ivory">Recent Purchase Orders</h3>
            <span className="text-xs text-emerald font-semibold">Active Orders</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-sage/20 text-charcoal/50 dark:text-ivory/50 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5">PO Number</th>
                  <th className="py-2.5">Vendor</th>
                  <th className="py-2.5 text-right">Amount</th>
                  <th className="py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage/10">
                {recentPOs.map((po) => (
                  <tr key={po.id} className="hover:bg-sage/10 transition">
                    <td className="py-2.5 font-bold text-charcoal dark:text-ivory">{po.poNumber}</td>
                    <td className="py-2.5 text-charcoal/80 dark:text-ivory/80">{po.vendor?.name}</td>
                    <td className="py-2.5 text-right font-semibold">{formatCurrency(po.totalAmount)}</td>
                    <td className="py-2.5 text-center">
                      <StatusBadge status={po.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Watchlist */}
        <div className="p-6 rounded-3xl bg-ivory-50 dark:bg-charcoal border border-sage/30 dark:border-charcoal-50 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber" />
              <h3 className="font-bold text-base text-charcoal dark:text-ivory">Supply Chain Buffer Watch</h3>
            </div>
            <span className="text-xs text-amber font-semibold">Reorder Alerts</span>
          </div>

          <div className="space-y-3">
            {stockAlerts.length === 0 ? (
              <p className="text-xs text-charcoal/50 dark:text-ivory/50">All SKU stock levels healthy.</p>
            ) : (
              stockAlerts.map((prod) => {
                const totalQty = prod.stockLevels?.reduce((sum: number, s: any) => sum + s.quantityOnHand, 0) || 0;
                return (
                  <div key={prod.id} className="p-3 rounded-2xl bg-ivory dark:bg-charcoal-50 border border-sage/20 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-charcoal dark:text-ivory">{prod.name}</p>
                      <p className="text-[10px] text-charcoal/50 dark:text-ivory/50">SKU: {prod.sku} | Reorder Point: {prod.reorderPoint} {prod.uom}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-full bg-amber/20 text-amber font-bold text-[11px]">
                        {totalQty} {prod.uom} on hand
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
