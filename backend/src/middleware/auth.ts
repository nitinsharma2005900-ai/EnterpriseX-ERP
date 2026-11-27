import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AppError } from './errorHandler';
import { prisma } from '../config/prisma';
import { scopeContext } from '../config/scope';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  organizationId: string;
  branchId?: string | null;
  departmentId?: string | null;
  warehouseId?: string | null;
  approvalLimit: number;
  fullName: string;
  tokenVersion?: number;
  pagination?: { model: string; page: number; pageSize: number };
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication token missing or invalid format', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as AuthUser;
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user?.active || user.tokenVersion !== decoded.tokenVersion) return next(new AppError('Session revoked or account inactive', 401, 'SESSION_REVOKED'));
    req.user = { ...decoded, ...user };
    const lists: Record<string, string> = { '/api/vendors': 'Vendor', '/api/customers': 'Customer', '/api/inventory/products': 'Product', '/api/inventory/warehouses': 'Warehouse', '/api/inventory/stock-levels': 'StockLevel', '/api/inventory/stock-movements': 'StockMovement', '/api/procurement/purchase-orders': 'PurchaseOrder', '/api/logistics/goods-receipts': 'GoodsReceipt', '/api/sales/sales-orders': 'SalesOrder', '/api/billing/invoices': 'Invoice', '/api/finance/accounts': 'Account', '/api/finance/periods': 'FinancialPeriod', '/api/finance/journals': 'JournalEntry', '/api/audit': 'AuditLog' };
    const model = lists[req.path.replace(/\/$/, '')] || lists[req.originalUrl.split('?')[0].replace(/\/$/, '')];
    if (req.method === 'GET' && model) req.user.pagination = { model, page: Math.min(100000, Math.max(1, Math.floor(Number(req.query.page) || 1))), pageSize: Math.min(500, Math.max(1, Math.floor(Number(req.query.pageSize) || 100))) };
    scopeContext.run(req.user!, () => next());
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Authentication token expired', 401, 'TOKEN_EXPIRED'));
    }
    next(new AppError('Invalid authentication token', 401, 'INVALID_TOKEN'));
  }
}
