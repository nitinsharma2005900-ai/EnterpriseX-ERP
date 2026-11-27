import { AsyncLocalStorage } from 'node:async_hooks';
import type { AuthUser } from '../middleware/auth';
export const scopeContext = new AsyncLocalStorage<AuthUser>();

export function modelScope(model?: string): any {
  const user = scopeContext.getStore();
  if (!user) return null;
  const org = user.organizationId;
  const department = user.role === 'DEPARTMENT_MANAGER' ? { id: user.departmentId || '__denied__' } : {};
  const warehouse = user.role === 'WAREHOUSE_OPERATOR' ? { id: user.warehouseId || '__denied__' } : {};
  const po = { department: { organizationId: org, ...department }, requestedBy: { branchId: user.role === 'ERP_ADMINISTRATOR' ? undefined : user.branchId || undefined } };
  switch (model) {
    case 'Account': case 'FinancialPeriod': case 'Vendor': case 'Customer': case 'Product': return { organizationId: org };
    case 'Department': return { organizationId: org, ...department };
    case 'Branch': return { organizationId: org, ...(user.role !== 'ERP_ADMINISTRATOR' ? { id: user.branchId || '__denied__' } : {}) };
    case 'Warehouse': return { branch: { organizationId: org, ...(user.role !== 'ERP_ADMINISTRATOR' ? { id: user.branchId || '__denied__' } : {}) }, ...warehouse };
    case 'PurchaseOrder': return po;
    case 'PurchaseOrderItem': return { purchaseOrder: po };
    case 'GoodsReceipt': return { warehouse: modelScope('Warehouse') };
    case 'StockLevel': case 'StockMovement': return { warehouse: modelScope('Warehouse') };
    case 'JournalEntry': return { period: { organizationId: org } };
    case 'JournalLine': return { account: { organizationId: org } };
    case 'SalesOrder': return { customer: { organizationId: org } };
    case 'Invoice': return { OR: [{ vendor: { organizationId: org } }, { customer: { organizationId: org } }] };
    case 'Payment': return { invoice: modelScope('Invoice') };
    case 'User': return { organizationId: org };
    case 'WorkflowRun': return { userId: user.id };
    case 'AuditLog': return { user: { organizationId: org } };
    default: return null;
  }
}
