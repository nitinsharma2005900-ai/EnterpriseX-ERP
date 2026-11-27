import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
dotenv.config();
const base = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
if (!base?.startsWith('postgres')) throw new Error('Tests require PostgreSQL');
const schema = `test_${Date.now()}_${randomBytes(3).toString('hex')}`;
const url = new URL(base); url.searchParams.set('schema', schema);
const env = { ...process.env, NODE_ENV: 'test', DATABASE_URL: url.toString() };
const control = new PrismaClient({ datasources: { db: { url: base } } });
const run = (file, args) => {
  const result = spawnSync(process.execPath, [file, ...args], { env, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Test preparation or execution failed (${result.status})`);
};
try {
  await control.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  run('node_modules/prisma/build/index.js', ['migrate', 'deploy']);
  run('node_modules/tsx/dist/cli.mjs', ['prisma/seed.ts']);
  run('node_modules/vitest/vitest.mjs', ['run']);
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await control.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await control.$disconnect(); }
