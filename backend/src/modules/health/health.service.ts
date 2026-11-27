import { config } from '../../config/env';
import { queueHealth } from '../integrations/jobs';
import { AppError } from '../../middleware/errorHandler';
import { documentNumber } from '../../utils/business';
import { db, transaction } from '../../config/transaction';
import { round } from '../../utils/decimal';
import { recordAuditLog } from '../../middleware/audit';

export class HealthService {
  /**
   * Assessment 14: System Readiness and Health Checks
   */
  static async getHealthStatus() {
    let dbStatus = 'UP';
    let dbLatencyMs = 0;

    const start = performance.now();
    try {
      await db().$queryRaw`SELECT 1`;
      dbLatencyMs = round(performance.now() - start, 2);
    } catch {
      dbStatus = 'DOWN';
    }

    let pythonStatus = 'DOWN';
    try { const response = await fetch(`${config.pythonServiceUrl}/health`, { signal: AbortSignal.timeout(3000) }); pythonStatus = response.ok ? 'UP' : 'DOWN'; } catch {}
    const redisStatus = await queueHealth();
    const memoryUsage = process.memoryUsage();

    return {
      status: dbStatus === 'UP' ? 'HEALTHY' : 'UNHEALTHY',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      services: {
        database: { status: dbStatus, latencyMs: dbLatencyMs, type: 'PostgreSQL' },
        pythonFinanceEngine: { status: pythonStatus },
        backgroundQueue: { status: redisStatus, driver: 'BullMQ; PostgreSQL durable outbox' },
      },
      system: {
        rssMB: round(memoryUsage.rss / (1024 * 1024), 2),
        heapUsedMB: round(memoryUsage.heapUsed / (1024 * 1024), 2),
      },
    };
  }

  /**
   * Assessment 15: Incident Diagnostic Engine
   * Detects ledger imbalance, duplicate invoices, negative stock, and open incidents
   */
  static async runDiagnostics() {
    const issues: any[] = [];

    // 1. Check double-entry journal balance across all journal lines
    const journalEntries = await db().journalEntry.findMany({
      include: { lines: true },
    });

    let unbalancedJournalsCount = 0;
    for (const je of journalEntries) {
      const debitSum = round(je.lines.reduce((acc, l) => acc + l.debit, 0));
      const creditSum = round(je.lines.reduce((acc, l) => acc + l.credit, 0));
      if (Math.abs(debitSum - creditSum) > 0.001) {
        unbalancedJournalsCount++;
        issues.push({
          severity: 'CRITICAL',
          type: 'JOURNAL_IMBALANCE',
          reference: je.entryNumber,
          description: `Journal Entry ${je.entryNumber} has debit sum ${debitSum} != credit sum ${creditSum}`,
        });
      }
    }

    // 2. Check for negative stock levels
    const negativeStockLevels = await db().stockLevel.findMany({
      where: { quantityOnHand: { lt: 0 } },
      include: { product: true, warehouse: true },
    });

    for (const st of negativeStockLevels) {
      issues.push({
        severity: 'HIGH',
        type: 'NEGATIVE_STOCK',
        reference: `${st.product.sku} @ ${st.warehouse.code}`,
        description: `Negative stock detected: ${st.quantityOnHand} ${st.product.uom}`,
      });
    }

    const [accounts, stocks, movements, invoices] = await Promise.all([
      db().account.findMany({ include: { journalLines: { where: { journalEntry: { status: 'POSTED' } } } } }),
      db().stockLevel.findMany(), db().stockMovement.findMany(), db().invoice.findMany({ include: { payments: true } }),
    ]);
    for (const account of accounts) {
      const expected = round(account.journalLines.reduce((v, l) => v + (['ASSET','EXPENSE'].includes(account.category) ? l.debit - l.credit : l.credit - l.debit), 0));
      if (Math.abs(expected - account.balance) > 0.01) issues.push({ severity: 'CRITICAL', type: 'ACCOUNT_BALANCE_MISMATCH', reference: account.code, description: `Stored balance ${account.balance} differs from posted ledger ${expected}` });
    }
    for (const stock of stocks) {
      const expected = round(movements.filter(m => m.productId === stock.productId && m.warehouseId === stock.warehouseId).reduce((v, m) => v + m.quantity, 0));
      if (expected !== round(stock.quantityOnHand) || stock.quantityReserved > stock.quantityOnHand) issues.push({ severity: 'HIGH', type: 'STOCK_LEDGER_MISMATCH', reference: stock.id, description: `Movement quantity ${expected}, on hand ${stock.quantityOnHand}, reserved ${stock.quantityReserved}` });
    }
    const valuation = round(stocks.reduce((sum, st) => sum + st.quantityOnHand * st.averageCost, 0));
    const ledgerValue = accounts.find(a => a.code === '1400')?.balance || 0;
    if (Math.abs(valuation - ledgerValue) > 0.05) issues.push({ severity: 'HIGH', type: 'STOCK_VALUATION', reference: '1400', description: `Stock valuation ${valuation} differs from ledger ${round(ledgerValue)}` });
    const seen = new Set<string>();
    for (const invoice of invoices.filter(i => i.status !== 'VOIDED')) {
      const key = invoice.poId ? `AP:${invoice.poId}` : invoice.soId ? `AR:${invoice.soId}` : '';
      if (key && seen.has(key)) issues.push({ severity: 'CRITICAL', type: 'DUPLICATE_INVOICE', reference: invoice.invoiceNumber, description: 'Multiple active invoices reference the same order' });
      seen.add(key);
      const paid = round(invoice.payments.filter(p => p.status === 'COMPLETED').reduce((v, p) => v + p.amount, 0));
      if (paid !== round(invoice.paidAmount) || round(invoice.totalAmount - paid) !== round(invoice.remainingAmount)) issues.push({ severity: 'CRITICAL', type: 'INCONSISTENT_DATA', reference: invoice.invoiceNumber, description: 'Invoice balance differs from recorded settlements' });
      if (!journalEntries.some(j => j.referenceType === 'INVOICE' && j.referenceId === invoice.id)) issues.push({ severity: 'HIGH', type: 'PARTIAL_WORKFLOW', reference: invoice.invoiceNumber, description: 'Issued invoice has no posted recognition journal' });
    }
    // 3. Check for open system incidents
    const openIncidents = await db().systemIncident.findMany({
      where: { status: { in: ['OPEN', 'INVESTIGATING'] } },
      orderBy: { createdAt: 'desc' },
    });

    return {
      timestamp: new Date().toISOString(),
      overallStatus: issues.length === 0 ? 'HEALTHY' : 'INCIDENTS_DETECTED',
      diagnostics: {
        totalJournalsAudited: journalEntries.length,
        unbalancedJournalsCount,
        negativeStockCount: negativeStockLevels.length,
        openIncidentsCount: openIncidents.length,
      },
      detectedIssues: issues,
      openIncidents,
    };
  }

  /**
   * Assessment 15: Incident Simulation Engine
   * Generates isolated test incidents to demonstrate root-cause diagnosis and automated remediation.
   */
  static async simulateIncident(type: 'LEDGER_IMBALANCE' | 'DUPLICATE_INVOICE' | 'NEGATIVE_STOCK' | 'PARTIAL_WORKFLOW' | 'STOCK_VALUATION' | 'INCONSISTENT_DATA') {
    let evidence: any;
    try {
      await transaction(async tx => {
        if (type === 'LEDGER_IMBALANCE') {
          const line = await tx.journalLine.findFirst();
          if (!line) throw new AppError('Post a journal before running this simulation', 409, 'DATA_REQUIRED');
          if (line.debit > 0) await tx.journalLine.update({ where: { id: line.id }, data: { debit: { increment: 1 } } });
          else await tx.journalLine.update({ where: { id: line.id }, data: { credit: { increment: 1 } } });
        } else if (type === 'DUPLICATE_INVOICE') {
          const invoice = await tx.invoice.findFirst();
          if (!invoice) throw new AppError('Create an invoice before running this simulation', 409, 'DATA_REQUIRED');
          const { id, ...copy } = invoice;
          await tx.invoice.create({ data: { ...copy } });
        } else if (type === 'NEGATIVE_STOCK') {
          const stock = await tx.stockLevel.findFirst();
          if (!stock) throw new AppError('Add stock before running this simulation', 409, 'DATA_REQUIRED');
          await tx.stockLevel.update({ where: { id: stock.id }, data: { quantityOnHand: -1 } });
        } else if (type === 'STOCK_VALUATION') {
          const stock = await tx.stockLevel.findFirst();
          if (!stock) throw new AppError('Add stock before running this simulation', 409, 'DATA_REQUIRED');
          await tx.stockLevel.update({ where: { id: stock.id }, data: { averageCost: { increment: 10 } } });
        } else {
          const invoice = await tx.invoice.findFirst();
          if (!invoice) throw new AppError('Create an invoice before running this simulation', 409, 'DATA_REQUIRED');
          if (type === 'INCONSISTENT_DATA') await tx.invoice.update({ where: { id: invoice.id }, data: { paidAmount: { increment: 1 } } });
          else {
            const { id, ...copy } = invoice;
            await tx.invoice.create({ data: { ...copy, invoiceNumber: documentNumber('INC-TEST'), poId: null, soId: null, grnId: null, status: 'ISSUED' } });
          }
        }
        evidence = await this.runDiagnostics();
        throw new Error('CONTROLLED_ROLLBACK');
      });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      if (!evidence) evidence = { guardPreventedCommit: true, code: error.code || 'DATABASE_CONSTRAINT', type };
    }
    const incident = await db().systemIncident.create({ data: {
      code: documentNumber('INC'), title: `Controlled ${type.toLowerCase().replace(/_/g, ' ')} verification`, severity: type === 'LEDGER_IMBALANCE' ? 'CRITICAL' : 'HIGH', status: 'OPEN',
      module: ['NEGATIVE_STOCK','STOCK_VALUATION'].includes(type) ? 'INVENTORY' : 'FINANCE',
      diagnosisDetails: JSON.stringify(evidence), rootCause: 'Administrator requested isolated failure injection; business mutations were rolled back.',
      resolutionAction: 'Database rollback completed. Inspect captured guard or scanner evidence and resolve this exercise record.',
    } });
    return incident;
  }

  static async resolveIncident(id: string, userId: string, notes?: string) {
    const incident = await db().systemIncident.findUnique({ where: { id } });
    if (!incident) throw new AppError('Incident not found', 404, 'NOT_FOUND');

    const updated = await db().systemIncident.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedBy: userId,
        resolvedAt: new Date(),
        resolutionAction: notes || incident.resolutionAction,
      },
    });

    await recordAuditLog({
      userId,
      action: 'INCIDENT_RESOLVE',
      entityType: 'INCIDENT',
      entityId: incident.id,
      afterState: { code: incident.code, status: 'RESOLVED' },
    });

    return updated;
  }
}
