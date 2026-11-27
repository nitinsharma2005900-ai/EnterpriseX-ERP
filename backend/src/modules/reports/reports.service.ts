import { db } from '../../config/transaction';
import { config } from '../../config/env';
import { round } from '../../utils/decimal';
import { AppError } from '../../middleware/errorHandler';

export async function financeRequest(path: string, payload: unknown): Promise<any> {
  try {
    const response = await fetch(`${config.pythonServiceUrl}/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Service-Token': config.serviceToken }, body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Finance service returned ${response.status}`);
    const result = await response.json();
    return JSON.parse(JSON.stringify(result), (key, value) => typeof value === 'string' && !['code','account_code','period','month','sku'].includes(key) && /^-?\d+(?:\.\d+)?$/.test(value) ? Number(value) : value);
  } catch { throw new AppError('Finance processing service is unavailable; retry shortly', 503, 'FINANCE_UNAVAILABLE'); }
}
export class ReportsService {
  static async getFinancialStatements(periodId?: string) {
    const period = periodId ? await db().financialPeriod.findUnique({ where: { id: periodId } }) : await db().financialPeriod.findFirst({ where: { status: 'OPEN' }, orderBy: { startDate: 'desc' } });
    if (periodId && !period) throw new AppError('Financial period not found', 404, 'NOT_FOUND');
    const accounts = await db().account.findMany({ orderBy: { code: 'asc' }, include: { journalLines: { where: { journalEntry: { status: 'POSTED', ...(period ? { date: { lte: period.endDate } } : {}) } } } } });
    return financeRequest('finance/trial-balance', { period_name: period?.name || 'All periods', accounts: accounts.map(a => ({ code: a.code, name: a.name, category: a.category, balance: round(a.journalLines.reduce((s, l) => s + (['ASSET','EXPENSE'].includes(a.category) ? l.debit - l.credit : l.credit - l.debit), 0)) })) });
  }
  static async getExecutiveAnalytics() {
    const [accounts, orders, stocks, invoices, journals, periods] = await Promise.all([
      db().account.findMany(), db().purchaseOrder.findMany({ where: { status: { notIn: ['REJECTED','CANCELLED','DRAFT'] } }, include: { vendor: true } }),
      db().stockLevel.findMany(), db().invoice.findMany(), db().journalEntry.findMany({ where: { status: 'POSTED' }, include: { lines: { include: { account: true } } } }), db().financialPeriod.count({ where: { status: 'OPEN' } }),
    ]);
    const total = (category: string) => round(accounts.filter(a => a.category === category).reduce((s, a) => s + a.balance, 0));
    const vendors: Record<string, number> = {};
    for (const po of orders) vendors[po.vendor.name] = round((vendors[po.vendor.name] || 0) + po.totalAmount);
    const spend = Object.values(vendors).reduce((a, b) => a + b, 0);
    const months: Record<string, { month: string; revenue: number; expenses: number; profit: number }> = {};
    for (const journal of journals) {
      const month = journal.date.toISOString().slice(0, 7);
      months[month] ||= { month, revenue: 0, expenses: 0, profit: 0 };
      for (const l of journal.lines) {
        if (l.account.category === 'REVENUE') months[month].revenue = round(months[month].revenue + l.credit - l.debit);
        if (l.account.category === 'EXPENSE') months[month].expenses = round(months[month].expenses + l.debit - l.credit);
      }
      months[month].profit = round(months[month].revenue - months[month].expenses);
    }
    const metrics = await financeRequest('analytics/executive-summary', {
      revenue: total('REVENUE'), expenses: total('EXPENSE'), cogs: accounts.find(a => a.code === '5010')?.balance || 0,
      accounts_receivable: round(invoices.filter(i => i.type === 'ACCOUNTS_RECEIVABLE' && i.status !== 'VOIDED').reduce((s, i) => s + i.remainingAmount, 0)),
      accounts_payable: round(invoices.filter(i => i.type === 'ACCOUNTS_PAYABLE' && i.status !== 'VOIDED').reduce((s, i) => s + i.remainingAmount, 0)),
      inventory_valuation: round(stocks.reduce((s, st) => s + st.quantityOnHand * st.averageCost, 0)),
      top_vendors: Object.entries(vendors).map(([vendor, value]) => ({ vendor, spend: value, share_pct: spend ? round(value / spend * 100, 1) : 0 })),
      monthly_trend: Object.values(months).sort((a, b) => a.month.localeCompare(b.month)).slice(-12),
    });
    return { ...metrics, kpis: { totalPOs: orders.length, totalInvoices: invoices.length, activeSKUs: new Set(stocks.map(s => s.productId)).size, openPeriods: periods } };
  }
}
