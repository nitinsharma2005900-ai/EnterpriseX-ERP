import dotenv from 'dotenv';
import path from 'path';

// Load .env from root or backend directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

if (process.env.NODE_ENV === 'production') {
  for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL', 'SERVICE_TOKEN']) {
    if (!process.env[key] || (key.includes('SECRET') && process.env[key]!.length < 32)) throw new Error(`Missing or invalid production configuration: ${key}`);
  }
  if (!process.env.DATABASE_URL?.startsWith('postgres')) throw new Error('Production requires persistent PostgreSQL');
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  pythonServiceUrl: process.env.PYTHON_SERVICE_URL || 'http://localhost:8000',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  jwt: {
    secret: process.env.JWT_SECRET || 'enterprisex_super_secret_jwt_key_development_only_change_in_production_32chars_minimum!',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'enterprisex_refresh_secret_development_only_change_in_production_32chars!',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  serviceToken: process.env.SERVICE_TOKEN || 'local-development-service-token',
  integrations: {
    emailMode: process.env.EMAIL_SERVICE_MODE || 'sandbox',
    docStorageMode: process.env.DOCUMENT_STORAGE_MODE || 'local',
    vendorMockEnabled: process.env.VENDOR_API_MOCK_ENABLED === 'true',
    accountingExportPath: process.env.ACCOUNTING_EXPORT_PATH || './exports',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableAudit: process.env.ENABLE_AUDIT_LOGGING !== 'false',
  },
};
