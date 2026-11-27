import dotenv from 'dotenv';
import { PrismaClient, Prisma } from '@prisma/client';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
dotenv.config();
const sourceUrl = process.env.DATABASE_URL;
if (!sourceUrl?.startsWith('postgres')) throw new Error('PostgreSQL is required');
const source = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
const restoreUrl = new URL(sourceUrl);
const schema = `restore_${Date.now()}`;
restoreUrl.searchParams.set('schema', schema);
const restored = new PrismaClient({ datasources: { db: { url: restoreUrl.toString() } } });
try {
  const backup = await source.$transaction(async tx => {
    const tables = {};
    for (const model of Prisma.dmmf.datamodel.models) tables[model.name] = await tx[model.name[0].toLowerCase() + model.name.slice(1)].findMany();
    return { version: 1, createdAt: new Date().toISOString(), tables };
  }, { isolationLevel: 'RepeatableRead', timeout: 120000 });
  mkdirSync('../.backups', { recursive: true });
  const keyPath = '../.backups/encryption.key';
  let key;
  try { key = readFileSync(keyPath); } catch { key = randomBytes(32); writeFileSync(keyPath, key, { mode: 0o600 }); }
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(backup)), cipher.final()]);
  const file = `../.backups/EnterpriseX-${Date.now()}.enc`;
  writeFileSync(file, Buffer.concat([iv, cipher.getAuthTag(), encrypted]), { mode: 0o600 });
  const saved = readFileSync(file); const decipher = createDecipheriv('aes-256-gcm', key, saved.subarray(0, 12));
  decipher.setAuthTag(saved.subarray(12, 28));
  const recovered = JSON.parse(Buffer.concat([decipher.update(saved.subarray(28)), decipher.final()]).toString());
  await source.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  const migration = spawnSync(process.execPath, ['node_modules/prisma/build/index.js','migrate','deploy'], { env: { ...process.env, DATABASE_URL: restoreUrl.toString(), DIRECT_DATABASE_URL: restoreUrl.toString() }, stdio: 'inherit' });
  if (migration.status !== 0) throw new Error('Restore migration failed');
  let rows = 0;
  await restored.$transaction(async tx => {
    for (const [model, records] of Object.entries(recovered.tables)) {
      const delegate = tx[model[0].toLowerCase() + model.slice(1)];
      if (records.length) await delegate.createMany({ data: records });
      const count = await delegate.count();
      if (count !== records.length) throw new Error(`Restore count mismatch for ${model}`);
      rows += count;
    }
  }, { timeout: 120000 });
  const result = { status: 'PASSED', tables: Object.keys(recovered.tables).length, rows, encryptedBackup: file, restoredToIsolatedSchema: true, productionDataModified: false };
  writeFileSync('../docs/backup-verification.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} finally {
  await restored.$disconnect();
  await source.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await source.$disconnect();
}
