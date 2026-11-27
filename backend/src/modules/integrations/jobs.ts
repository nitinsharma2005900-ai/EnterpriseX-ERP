import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../../config/prisma';
import { config } from '../../config/env';

// PostgreSQL is the durable outbox; Redis is a delivery mechanism. Redis loss is
// recovered by re-enqueueing unfinished records. Jobs never claim an email sent
// unless the configured transport actually accepted it.
let queue: Queue | undefined;
let worker: Worker | undefined;
let connection: IORedis | undefined;
export const queueName = 'enterprisex-integration-v1';

export async function enqueueJob(id: string) {
  if (!queue) return;
  await queue.add('deliver', { id }, { jobId: id, attempts: 4, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: true, removeOnFail: 100 });
}
export async function startWorker() {
  if (!process.env.REDIS_URL) return;
  connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });
  connection.on('error', () => {});
  queue = new Queue(queueName, { connection: connection as any });
  worker = new Worker(queueName, async job => {
    const record = await prisma.integrationJob.findUnique({ where: { id: job.data.id } });
    if (!record || ['DELIVERED','SANDBOX_CAPTURED'].includes(record.status)) return;
    await prisma.integrationJob.update({ where: { id: record.id }, data: { status: 'PROCESSING', attempts: { increment: 1 } } });
    try {
      if (!process.env.EMAIL_WEBHOOK_URL) throw new Error('Email delivery transport is not configured');
      const res = await fetch(process.env.EMAIL_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': record.idempotencyKey, Authorization: `Bearer ${process.env.EMAIL_WEBHOOK_TOKEN || ''}` }, body: record.payload, signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`Email transport returned ${res.status}`);
      await prisma.integrationJob.update({ where: { id: record.id }, data: { status: 'DELIVERED', error: null, result: 'Transport accepted message' } });
    } catch (error: any) {
      await prisma.integrationJob.update({ where: { id: record.id }, data: { status: 'FAILED', error: error.message } });
      throw error;
    }
  }, { connection: connection as any, concurrency: 2 });
  worker.on('error', () => {});
  for (const job of await prisma.integrationJob.findMany({ where: { status: { in: ['QUEUED','PROCESSING'] } }, take: 100 })) await enqueueJob(job.id);
}
export async function queueHealth() {
  try { return connection ? await connection.ping() === 'PONG' ? 'UP' : 'DOWN' : 'NOT_CONFIGURED'; }
  catch { return 'DOWN'; }
}
export async function stopWorker() {
  await worker?.close(); await queue?.close(); await connection?.quit();
}
