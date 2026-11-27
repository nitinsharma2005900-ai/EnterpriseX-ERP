import { AsyncLocalStorage } from 'node:async_hooks';
import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

const context = new AsyncLocalStorage<Prisma.TransactionClient>();
export const db = () => context.getStore() || prisma;

// Nested domain operations share one transaction. PostgreSQL serializable conflicts
// retry the entire unit of work, never an individual payment or stock mutation.
export async function transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  const existing = context.getStore();
  if (existing) return work(existing);
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(tx => context.run(tx, () => work(tx)), {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000, maxWait: 10000,
      });
    } catch (error: any) {
      if (error.code !== 'P2034' || attempt >= 3) throw error;
      await new Promise(resolve => setTimeout(resolve, 30 * (attempt + 1)));
    }
  }
}
