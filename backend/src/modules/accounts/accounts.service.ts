import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { round, isEqual } from '../../utils/decimal';
import { recordAuditLog } from '../../middleware/audit';

export class AccountsService {
  static async getChartOfAccounts() {
    return prisma.account.findMany({
      orderBy: { code: 'asc' },
    });
  }

  static async createAccount(data: {
    code: string;
    name: string;
    category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
    subcategory?: string;
    currency?: string;
  }) {
    const existing = await prisma.account.findUnique({ where: { code: data.code } });
    if (existing) {
      throw new AppError(`Account code ${data.code} already exists`, 409, 'ACCOUNT_EXISTS');
    }

    return prisma.account.create({
      data: {
        code: data.code,
        name: data.name,
        category: data.category,
        subcategory: data.subcategory,
        currency: data.currency || 'USD',
        balance: 0.0,
      },
    });
  }

  static async getFinancialPeriods() {
    return prisma.financialPeriod.findMany({
      orderBy: { startDate: 'desc' },
    });
  }

  static async createFinancialPeriod(data: {
    name: string;
    startDate: Date;
    endDate: Date;
  }) {
    const existing = await prisma.financialPeriod.findUnique({ where: { name: data.name } });
    if (existing) {
      throw new AppError(`Financial period ${data.name} already exists`, 409, 'PERIOD_EXISTS');
    }

    return prisma.financialPeriod.create({
      data: {
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        status: 'OPEN',
      },
    });
  }

  static async closeFinancialPeriod(periodId: string, userId: string) {
    const period = await prisma.financialPeriod.findUnique({ where: { id: periodId } });
    if (!period) throw new AppError('Period not found', 404, 'PERIOD_NOT_FOUND');
    if (period.status === 'CLOSED' || period.status === 'LOCKED') {
      throw new AppError(`Period is already ${period.status}`, 400, 'PERIOD_ALREADY_CLOSED');
    }

    return prisma.financialPeriod.update({
      where: { id: periodId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedBy: userId,
      },
    });
  }

  static async createJournalEntry(data: {
    entryNumber: string;
    date?: Date;
    periodId: string;
    referenceType: string;
    referenceId?: string;
    description: string;
    createdById: string;
    lines: Array<{
      accountId: string;
      description?: string;
      debit: number;
      credit: number;
    }>;
  }, requestId?: string) {
    // 1. Period verification
    const period = await prisma.financialPeriod.findUnique({ where: { id: data.periodId } });
    if (!period) throw new AppError('Financial period not found', 404, 'PERIOD_NOT_FOUND');
    if (period.status !== 'OPEN') {
      throw new AppError(
        `Cannot post journal entry. Financial period '${period.name}' is ${period.status}. Postings are forbidden.`,
        400,
        'PERIOD_CLOSED'
      );
    }

    // 2. Validate lines existence
    if (!data.lines || data.lines.length < 2) {
      throw new AppError('Journal entry must have at least two transaction lines.', 400, 'INVALID_JOURNAL');
    }

    // 3. Double-entry balance calculation
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of data.lines) {
      const debit = round(Number(line.debit || 0));
      const credit = round(Number(line.credit || 0));

      if (debit < 0 || credit < 0) {
        throw new AppError('Debit and credit amounts cannot be negative.', 400, 'NEGATIVE_AMOUNT');
      }

      if (debit > 0 && credit > 0) {
        throw new AppError('A single line item cannot contain both debit and credit amounts.', 400, 'DUAL_ENTRY');
      }

      totalDebit = round(totalDebit + debit);
      totalCredit = round(totalCredit + credit);
    }

    if (totalDebit === 0 && totalCredit === 0) {
      throw new AppError('Journal entry total amount cannot be zero.', 400, 'ZERO_AMOUNT');
    }

    if (!isEqual(totalDebit, totalCredit)) {
      const imbalance = round(totalDebit - totalCredit);
      throw new AppError(
        `Double-entry imbalance detected: Total Debits ($${totalDebit.toFixed(2)}) != Total Credits ($${totalCredit.toFixed(2)}). Imbalance: $${imbalance.toFixed(2)}`,
        400,
        'JOURNAL_IMBALANCE'
      );
    }

    // 4. Atomic database transaction
    return prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          entryNumber: data.entryNumber,
          date: data.date || new Date(),
          periodId: data.periodId,
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          description: data.description,
          createdById: data.createdById,
          status: 'POSTED',
          lines: {
            create: data.lines.map((l) => ({
              accountId: l.accountId,
              description: l.description,
              debit: round(Number(l.debit || 0)),
              credit: round(Number(l.credit || 0)),
            })),
          },
        },
        include: { lines: { include: { account: true } }, period: true },
      });

      // Update account balances
      for (const line of data.lines) {
        const debit = round(Number(line.debit || 0));
        const credit = round(Number(line.credit || 0));
        const account = await tx.account.findUnique({ where: { id: line.accountId } });

        if (account) {
          // In normal accounting:
          // Assets & Expenses increase with debit, decrease with credit
          // Liabilities, Equity & Revenue increase with credit, decrease with debit
          let netChange = 0;
          if (['ASSET', 'EXPENSE'].includes(account.category)) {
            netChange = debit - credit;
          } else {
            netChange = credit - debit;
          }

          await tx.account.update({
            where: { id: line.accountId },
            data: { balance: round(account.balance + netChange) },
          });
        }
      }

      await recordAuditLog({
        userId: data.createdById,
        action: 'POST',
        entityType: 'JOURNAL',
        entityId: entry.id,
        afterState: { entryNumber: entry.entryNumber, totalDebit, totalCredit },
        requestId,
      });

      return entry;
    });
  }

  static async getJournalEntries(query?: { periodId?: string; referenceType?: string }) {
    const where: any = {};
    if (query?.periodId) where.periodId = query.periodId;
    if (query?.referenceType) where.referenceType = query.referenceType;

    return prisma.journalEntry.findMany({
      where,
      include: {
        period: true,
        lines: { include: { account: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  static async getGeneralLedger() {
    const accounts = await prisma.account.findMany({
      include: {
        journalLines: {
          include: { journalEntry: true },
          orderBy: { journalEntry: { date: 'asc' } },
        },
      },
      orderBy: { code: 'asc' },
    });

    return accounts.map((acc) => {
      let runningBalance = 0;
      const transactions = acc.journalLines.map((line) => {
        const debit = line.debit;
        const credit = line.credit;
        if (['ASSET', 'EXPENSE'].includes(acc.category)) {
          runningBalance = round(runningBalance + (debit - credit));
        } else {
          runningBalance = round(runningBalance + (credit - debit));
        }

        return {
          id: line.id,
          date: line.journalEntry.date,
          entryNumber: line.journalEntry.entryNumber,
          description: line.description || line.journalEntry.description,
          referenceType: line.journalEntry.referenceType,
          debit,
          credit,
          runningBalance,
        };
      });

      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        category: acc.category,
        currentBalance: acc.balance,
        transactions,
      };
    });
  }
}
