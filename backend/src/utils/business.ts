import { randomUUID } from 'node:crypto';
import { db } from '../config/transaction';
import { AppError } from '../middleware/errorHandler';
import { round } from './decimal';

export const documentNumber = (prefix: string) => `${prefix}-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 12).toUpperCase()}`;
export function assert(condition: unknown, message: string, code = 'INVALID_INPUT', status = 400): asserts condition {
  if (!condition) throw new AppError(message, status, code);
}

export async function postJournal(referenceType: string, referenceId: string, description: string, userId: string,
  lines: Array<{ code: string; debit: number; credit: number }>) {
  const tx = db();
  const now = new Date();
  const period = await tx.financialPeriod.findFirst({ where: { status: 'OPEN', startDate: { lte: now }, endDate: { gte: now } } });
  if (!period) throw new AppError('No open financial period covers the posting date', 400, 'PERIOD_CLOSED');
  const accounts = await tx.account.findMany({ where: { code: { in: lines.map(l => l.code) }, active: true } });
  if (accounts.length !== new Set(lines.map(l => l.code)).size) throw new AppError('Required ledger account is missing or inactive', 409, 'ACCOUNT_MISSING');
  if (round(lines.reduce((s, l) => s + l.debit - l.credit, 0)) !== 0) throw new AppError('Journal is unbalanced', 400, 'JOURNAL_IMBALANCE');
  const entry = await tx.journalEntry.create({ data: {
    entryNumber: documentNumber('JE'), periodId: period.id, referenceType, referenceId, description, createdById: userId,
    lines: { create: lines.filter(l => l.debit || l.credit).map(l => ({ accountId: accounts.find(a => a.code === l.code)!.id, debit: round(l.debit), credit: round(l.credit) })) },
  } });
  for (const line of lines) {
    const account = accounts.find(a => a.code === line.code)!;
    const delta = ['ASSET', 'EXPENSE'].includes(account.category) ? line.debit - line.credit : line.credit - line.debit;
    await tx.account.update({ where: { id: account.id }, data: { balance: { increment: round(delta) } } });
  }
  return entry;
}
