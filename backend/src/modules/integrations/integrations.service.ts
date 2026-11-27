import { db, transaction } from '../../config/transaction';
import { AppError } from '../../middleware/errorHandler';

import { enqueueJob } from './jobs';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { AccountsService } from '../accounts/accounts.service';

export class IntegrationsService {
  static async sendEmail(to: string, subject: string, body: string, idempotencyKey = randomUUID()) {
    const existing = await db().integrationJob.findUnique({ where: { idempotencyKey } });
    if (existing) {
      if (existing.payload !== JSON.stringify({ to, subject, body })) throw new AppError('Idempotency key conflict', 409, 'IDEMPOTENCY_CONFLICT');
      return existing;
    }
    const job = await db().integrationJob.create({ data: { idempotencyKey, type: 'EMAIL', payload: JSON.stringify({ to, subject, body }), status: 'QUEUED' } });
    await enqueueJob(job.id);
    return job;
  }
  static getEmailQueue() {
    return db().integrationJob.findMany({ where: { type: 'EMAIL' }, orderBy: { createdAt: 'desc' }, take: 50 });
  }

  /**
   * Assessment 08: Vendor API Mock Simulator
   * Simulates external vendor order acknowledgment, electronic ASN, and price quote verification.
   */
  static async simulateVendorDispatch(poNumber: string) {
    const order = await db().purchaseOrder.findUnique({ where: { poNumber } });
    if (!order) throw new AppError('Purchase order not found', 404, 'NOT_FOUND');
    const trackingNumber = `TRK-EXP-${Math.floor(100000 + Math.random() * 900000)}`;
    const estimatedArrival = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    return {
      success: true,
      mode: 'EXPLICIT_VENDOR_SANDBOX',
      vendorResponse: {
        status: 'DISPATCHED',
        poNumber,
        carrier: 'Enterprise Logistics Express',
        trackingNumber,
        estimatedArrival,
        asnReference: `ASN-${poNumber}`,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Assessment 08: Accounting Export (CSV / JSON format)
   */
  static async exportAccountingData(format: 'json' | 'csv' = 'json') {
    if (!['json','csv'].includes(format)) throw new AppError('Unsupported export format', 400, 'INVALID_FORMAT');
    const accounts = await db().account.findMany({ orderBy: { code: 'asc' } });
    const journals = await db().journalEntry.findMany({
      include: { lines: { include: { account: true } }, period: true },
      orderBy: { date: 'desc' },

    });

    const cell = (value: unknown) => { let str = String(value ?? ''); if (/^[=+@\t\r-]/.test(str)) str = "'" + str; return '"' + str.replace(/"/g, '""') + '"'; };
    if (format === 'csv') {
      let csv = 'EntryNumber,Date,Period,AccountCode,AccountName,Debit,Credit,Description\n';
      for (const j of journals) {
        for (const l of j.lines) {
          csv += [j.entryNumber, j.date.toISOString(), j.period.name, l.account.code, l.account.name, l.debit, l.credit, l.description || j.description].map(cell).join(',') + '\n';
        }
      }
      return { format: 'csv', data: csv, filename: `GL_Export_${Date.now()}.csv` };
    }

    return {
      format: 'json',
      data: {
        exportedAt: new Date().toISOString(),
        chartOfAccounts: accounts,
        journalEntries: journals,
      },
      filename: `Accounting_Export_${Date.now()}.json`,
    };
  }

  /**
   * Assessment 08: Accounting Import (Mock importer with validation)
   */
  static async importAccountingData(data: { accounts?: any[]; journals?: any[] }, actorId: string) {
    const schema = z.object({ accounts: z.array(z.object({ code: z.string().min(1), name: z.string().min(1), category: z.enum(['ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE']), subcategory: z.string().optional(), currency: z.string().length(3).optional() })).max(500).optional(), journals: z.array(z.any()).max(100).optional() });
    const parsed = schema.safeParse(data);
    if (!parsed.success) throw new AppError('Invalid accounting import', 400, 'VALIDATION_ERROR');
    return transaction(async tx => {
      let importedAccounts = 0;
      for (const acc of parsed.data.accounts || []) {
        const existing = await tx.account.findUnique({ where: { code: acc.code } });
        if (existing && existing.category !== acc.category) throw new AppError('Cannot change account category through import', 409, 'ACCOUNT_CATEGORY_CONFLICT');
        await tx.account.upsert({ where: { code: acc.code }, create: { ...acc, balance: 0 }, update: { name: acc.name, subcategory: acc.subcategory } });
        importedAccounts++;
      }
      for (const journal of parsed.data.journals || []) {
        const valid = z.object({ entryNumber: z.string().min(1), periodId: z.string().min(1), description: z.string().min(1), lines: z.array(z.object({ accountId: z.string().min(1), debit: z.number().nonnegative(), credit: z.number().nonnegative() })).min(2) }).safeParse(journal);
        if (!valid.success) throw new AppError('Invalid journal import', 400, 'VALIDATION_ERROR');
        await AccountsService.createJournalEntry({ ...valid.data, createdById: actorId, referenceType: 'IMPORT' });
      }
      return { success: true, importedAccounts, importedJournals: parsed.data.journals?.length || 0 };
    });
  }
}
