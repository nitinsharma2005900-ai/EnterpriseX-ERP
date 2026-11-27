import { createHash, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, transaction } from '../../config/transaction';
import { config } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import { recordAuditLog } from '../../middleware/audit';

export class AuthService {
  static async login(email: string, password: string, ipAddress?: string, requestId?: string) {
    const user = await db().user.findUnique({
      where: { email },
      include: { organization: true, branch: true, department: true, warehouse: true },
    });

    if (!user || !user.active) {
      await recordAuditLog({
        userEmail: email,
        action: 'LOGIN',
        entityType: 'USER',
        success: false,
        failureReason: 'Invalid credentials or inactive user account',
        ipAddress,
        requestId,
      });
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await recordAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'LOGIN',
        entityType: 'USER',
        success: false,
        failureReason: 'Password verification failed',
        ipAddress,
        requestId,
      });
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const payload = {
      id: user.id,
      tokenVersion: user.tokenVersion,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      organizationId: user.organizationId,
      branchId: user.branchId,
      departmentId: user.departmentId,
      warehouseId: user.warehouseId,
      approvalLimit: user.approvalLimit,
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as any,
    });

    const refreshToken = jwt.sign({ id: user.id, jti: randomUUID() }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn as any,
    });

    await db().authSession.create({ data: { userId: user.id, tokenHash: createHash('sha256').update(refreshToken).digest('hex'), expiresAt: new Date(Date.now() + 7 * 86400000) } });

    await recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'LOGIN',
      entityType: 'USER',
      entityId: user.id,
      success: true,
      ipAddress,
      requestId,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
        branchName: user.branch?.name,
        departmentName: user.department?.name,
        warehouseName: user.warehouse?.name,
        approvalLimit: user.approvalLimit,
      },
      accessToken,
      refreshToken,
    };
  }

  static async refreshToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as { id: string };
      return await transaction(async tx => {
        const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
        const session = await tx.authSession.findUnique({ where: { tokenHash } });
        const user = await tx.user.findUnique({ where: { id: decoded.id } });
        if (!session || session.revokedAt || session.expiresAt < new Date() || !user?.active || session.userId !== user.id) throw new Error('Invalid session');
        await tx.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
        const nextRefreshToken = jwt.sign({ id: user.id, jti: randomUUID() }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn as any });
        await tx.authSession.create({ data: { userId: user.id, tokenHash: createHash('sha256').update(nextRefreshToken).digest('hex'), expiresAt: new Date(Date.now() + 7 * 86400000) } });
        const { passwordHash, ...payload } = user;
        return { accessToken: jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn as any }), refreshToken: nextRefreshToken };
      });
    } catch {
      throw new AppError('Refresh token expired, revoked or invalid', 401, 'TOKEN_EXPIRED');
    }
  }

  static async logout(userId: string) {
    await transaction(async tx => {
      await tx.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
      await tx.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    });
  }

  static async getMe(userId: string) {
    const user = await db().user.findUnique({
      where: { id: userId },
      include: { organization: true, branch: true, department: true, warehouse: true },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    return {
      id: user.id,
      tokenVersion: user.tokenVersion,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      approvalLimit: user.approvalLimit,
      organization: user.organization,
      branch: user.branch,
      department: user.department,
      warehouse: user.warehouse,
    };
  }

  static getDemoAccounts() {
    return [
      {
        role: 'ERP_ADMINISTRATOR',
        roleLabel: 'ERP Administrator',
        email: 'admin@enterprisex.com',
        description: 'Full system control, incident management, user roles and governance',
        approvalLimit: 1000000,
      },
      {
        role: 'FINANCE_OFFICER',
        roleLabel: 'Finance Officer',
        email: 'finance@enterprisex.com',
        description: 'General ledger, journal postings, 3-way invoice matching, payments and reports',
        approvalLimit: 250000,
      },
      {
        role: 'DEPARTMENT_MANAGER',
        roleLabel: 'Department Manager',
        email: 'manager@enterprisex.com',
        description: 'Procurement budget approvals, department expenditures up to $50,000',
        approvalLimit: 50000,
      },
      {
        role: 'PROCUREMENT_OFFICER',
        roleLabel: 'Procurement Officer',
        email: 'procurement@enterprisex.com',
        description: 'Vendor management, RFQs, purchase orders and purchase agreements',
        approvalLimit: 10000,
      },
      {
        role: 'WAREHOUSE_OPERATOR',
        roleLabel: 'Warehouse Operator',
        email: 'warehouse@enterprisex.com',
        description: 'Goods receipt notes (GRN), inventory inspections, bin transfers and stock counts',
        approvalLimit: 0,
      },
      {
        role: 'SALES_USER',
        roleLabel: 'Sales Representative',
        email: 'sales@enterprisex.com',
        description: 'Customer relations, sales order booking, stock reservation and shipping',
        approvalLimit: 5000,
      },
    ];
  }
}
