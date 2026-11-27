import { prisma } from '../config/prisma';
import { logger } from '../config/logger';

export interface AuditRecordOptions {
  userId?: string | null;
  userEmail?: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'POST' | 'VOID' | 'RECONCILE' | 'LOGIN' | 'INCIDENT_RESOLVE';
  entityType: 'PO' | 'GRN' | 'INVOICE' | 'PAYMENT' | 'JOURNAL' | 'STOCK' | 'USER' | 'SETTING' | 'INCIDENT';
  entityId?: string | null;
  beforeState?: any;
  afterState?: any;
  ipAddress?: string;
  requestId?: string;
  success?: boolean;
  failureReason?: string;
}

/**
 * Assessment 04: Immutable Audit Trail Recorder.
 */
export async function recordAuditLog(options: AuditRecordOptions): Promise<void> {
  try {
    let validUserId: string | null = null;
    if (options.userId) {
      const exists = await prisma.user.findUnique({ where: { id: options.userId }, select: { id: true } });
      if (exists) validUserId = exists.id;
    }

    await prisma.auditLog.create({
      data: {
        userId: validUserId,
        userEmail: options.userEmail || (options.userId && !validUserId ? options.userId : null),
        action: options.action,
        entityType: options.entityType,
        entityId: options.entityId || null,
        beforeState: options.beforeState ? JSON.stringify(options.beforeState) : null,
        afterState: options.afterState ? JSON.stringify(options.afterState) : null,
        ipAddress: options.ipAddress || null,
        requestId: options.requestId || null,
        success: options.success !== false,
        failureReason: options.failureReason || null,
      },
    });
  } catch (err: any) {
    logger.error('Failed to write audit log entry', { error: err.message, options });
  }
}
