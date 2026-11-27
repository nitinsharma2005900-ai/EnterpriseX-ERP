import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

/**
 * Assessment 04: Organization, branch, department, warehouse, and module-level access control.
 * With approval limits and role hierarchies.
 */

export const Roles = {
  ADMIN: 'ERP_ADMINISTRATOR',
  FINANCE: 'FINANCE_OFFICER',
  PROCUREMENT: 'PROCUREMENT_OFFICER',
  WAREHOUSE: 'WAREHOUSE_OPERATOR',
  SALES: 'SALES_USER',
  DEPT_MANAGER: 'DEPARTMENT_MANAGER',
} as const;

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    // ERP_ADMINISTRATOR has root access to all modules
    if (req.user.role === Roles.ADMIN) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(
        `Access denied. Role '${req.user.role}' lacks permission for this resource. Required: [${allowedRoles.join(', ')}]`,
        403,
        'FORBIDDEN'
      );
    }

    next();
  };
}

export function enforceScope(options: {
  checkDepartment?: boolean;
  checkWarehouse?: boolean;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) return next();

    if (req.user.role === Roles.ADMIN) return next();

    // Department boundary enforcement
    if (options.checkDepartment && req.body.departmentId) {
      if (
        req.user.departmentId &&
        req.body.departmentId !== req.user.departmentId &&
        req.user.role === Roles.DEPT_MANAGER
      ) {
        throw new AppError(
          'Department manager can only manage or approve records within their assigned department.',
          403,
          'DEPARTMENT_MISMATCH'
        );
      }
    }

    // Warehouse boundary enforcement
    if (options.checkWarehouse && req.body.warehouseId) {
      if (
        req.user.warehouseId &&
        req.body.warehouseId !== req.user.warehouseId &&
        req.user.role === Roles.WAREHOUSE
      ) {
        throw new AppError(
          'Warehouse operator can only manage inventory for their assigned warehouse.',
          403,
          'WAREHOUSE_MISMATCH'
        );
      }
    }

    next();
  };
}

export function enforceApprovalLimit(amountField = 'totalAmount') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) return next();

    if (req.user.role === Roles.ADMIN) return next();

    const amount = Number(req.body[amountField] || req.body.amount || 0);
    const limit = Number(req.user.approvalLimit || 0);

    if (limit > 0 && amount > limit) {
      throw new AppError(
        `Approval limit exceeded. Requested transaction amount ($${amount.toFixed(
          2
        )}) exceeds user approval limit ($${limit.toFixed(2)}). Escalation required.`,
        403,
        'APPROVAL_LIMIT_EXCEEDED'
      );
    }

    next();
  };
}
