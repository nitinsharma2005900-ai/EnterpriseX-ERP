import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';

export interface EmailMessage {
  id: string;
  to: string;
  subject: string;
  body: string;
  sentAt: Date;
  status: 'SENT' | 'QUEUED' | 'FAILED';
}

const mockEmailQueue: EmailMessage[] = [];

export class IntegrationsService {
  /**
   * Assessment 08: Mock Sandbox Email Notification Service
   */
  static async sendEmail(to: string, subject: string, body: string): Promise<EmailMessage> {
    const email: EmailMessage = {
      id: `EMAIL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      to,
      subject,
      body,
      sentAt: new Date(),
      status: 'SENT',
    };
    mockEmailQueue.unshift(email);
    return email;
  }

  static getEmailQueue() {
    return mockEmailQueue.slice(0, 50);
  }

  /**
   * Assessment 08: Vendor API Mock Simulator
   * Simulates external vendor order acknowledgment, electronic ASN, and price quote verification.
   */
  static async simulateVendorDispatch(poNumber: string) {
    const trackingNumber = `TRK-EXP-${Math.floor(100000 + Math.random() * 900000)}`;
    const estimatedArrival = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    return {
      success: true,
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
    const accounts = await prisma.account.findMany({ orderBy: { code: 'asc' } });
    const journals = await prisma.journalEntry.findMany({
      include: { lines: { include: { account: true } }, period: true },
      orderBy: { date: 'desc' },
      take: 100,
    });

    if (format === 'csv') {
      let csv = 'EntryNumber,Date,Period,AccountCode,AccountName,Debit,Credit,Description\n';
      for (const j of journals) {
        for (const l of j.lines) {
          csv += `"${j.entryNumber}","${j.date.toISOString()}","${j.period.name}","${l.account.code}","${l.account.name}",${l.debit},${l.credit},"${l.description || j.description}"\n`;
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
  static async importAccountingData(data: { accounts?: any[]; journals?: any[] }) {
    let importedAccounts = 0;
    if (data.accounts && Array.isArray(data.accounts)) {
      for (const acc of data.accounts) {
        if (acc.code && acc.name && acc.category) {
          await prisma.account.upsert({
            where: { code: acc.code },
            create: {
              code: acc.code,
              name: acc.name,
              category: acc.category,
              subcategory: acc.subcategory,
              currency: acc.currency || 'USD',
              balance: 0.0,
            },
            update: {
              name: acc.name,
              category: acc.category,
            },
          });
          importedAccounts++;
        }
      }
    }

    return {
      success: true,
      message: `Import processed. ${importedAccounts} accounts verified or updated.`,
      importedAccounts,
    };
  }
}
