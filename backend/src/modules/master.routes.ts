import { Router } from 'express';
import { prisma } from '../config/prisma';
import { transaction } from '../config/transaction';
import { authenticate } from '../middleware/auth';
import { requireRole, Roles } from '../middleware/rbac';
import { validate, z, text, money } from '../middleware/validate';
import { assert } from '../utils/business';
import { recordAuditLog } from '../middleware/audit';

export const masterRoutes = Router();
masterRoutes.use(authenticate);
const party = z.object({ name: text.optional(), email: z.string().email().optional(), phone: text.optional(), address: text.optional(), paymentTerms: z.enum(['NET15','NET30','NET60']).optional(), status: z.enum(['ACTIVE','SUSPENDED','INACTIVE']).optional() });
const definitions = [
  { path: '/vendors', model: 'vendor', roles: [Roles.PROCUREMENT], schema: party },
  { path: '/customers', model: 'customer', roles: [Roles.SALES], schema: party.extend({ creditLimit: money.optional() }) },
  { path: '/inventory/products', model: 'product', roles: [Roles.PROCUREMENT,Roles.WAREHOUSE], schema: z.object({ name: text.optional(), description: text.optional(), unitPrice: money.optional(), reorderPoint: money.optional(), active: z.boolean().optional() }) },
  { path: '/finance/accounts', model: 'account', roles: [Roles.FINANCE], schema: z.object({ name: text.optional(), subcategory: text.optional(), active: z.boolean().optional() }) },
];
for (const definition of definitions) {
  masterRoutes.patch(`${definition.path}/:id`, requireRole(...definition.roles), validate(definition.schema), async (req, res, next) => {
    try {
      const data = await transaction(async tx => {
        const model = (tx as any)[definition.model];
        const before = await model.findUnique({ where: { id: req.params.id } });
        assert(before, 'Record not found', 'NOT_FOUND', 404);
        const data = await model.update({ where: { id: before.id }, data: req.body });
        await recordAuditLog({ userId: req.user!.id, action: 'UPDATE', entityType: 'SETTING', entityId: before.id, beforeState: before, afterState: data, requestId: req.id });
        return data;
      });
      res.json({ success: true, data });
    } catch (error) { next(error); }
  });
  masterRoutes.delete(`${definition.path}/:id`, requireRole(...definition.roles), async (req, res, next) => {
    try {
      await transaction(async tx => {
        const model = (tx as any)[definition.model];
        const before = await model.findUnique({ where: { id: req.params.id } });
        assert(before, 'Record not found', 'NOT_FOUND', 404);
        if (definition.model === 'product') {
          assert(!await tx.stockLevel.count({ where: { productId: before.id } }), 'Product has stock history; deactivate it instead', 'RECORD_IN_USE', 409);
        }
        if (definition.model === 'vendor') assert(!await tx.purchaseOrder.count({ where: { vendorId: before.id } }) && !await tx.invoice.count({ where: { vendorId: before.id } }), 'Vendor has transaction history; deactivate it instead', 'RECORD_IN_USE', 409);
        if (definition.model === 'customer') assert(!await tx.salesOrder.count({ where: { customerId: before.id } }) && !await tx.invoice.count({ where: { customerId: before.id } }), 'Customer has transaction history; deactivate it instead', 'RECORD_IN_USE', 409);
        if (definition.model === 'account') assert(!await tx.journalLine.count({ where: { accountId: before.id } }), 'Account has posted journals; deactivate it instead', 'RECORD_IN_USE', 409);
        await model.delete({ where: { id: before.id } });
        await recordAuditLog({ userId: req.user!.id, action: 'DELETE', entityType: 'SETTING', entityId: before.id, beforeState: before, requestId: req.id });
      });
      res.json({ success: true });
    } catch (error: any) {
      if (error.code === 'P2003') return next(Object.assign(new Error('Record has transaction history; deactivate it instead'), { statusCode: 409, code: 'RECORD_IN_USE' }));
      next(error);
    }
  });
}

masterRoutes.get('/notifications', async (req, res, next) => {
  try {
    const [pending, stock] = await Promise.all([
      prisma.purchaseOrder.findMany({ where: { status: 'PENDING_APPROVAL' }, take: 10 }),
      prisma.stockLevel.findMany({ include: { product: true, warehouse: true }, take: 100 }),
    ]);
    const data = [
      ...pending.map(p => ({ id: p.id, title: `Pending approval: ${p.poNumber}`, desc: `Requested amount USD ${p.totalAmount.toFixed(2)}`, type: 'INFO', time: p.createdAt.toISOString() })),
      ...stock.filter(s => s.quantityOnHand - s.quantityReserved <= s.product.reorderPoint).map(s => ({ id: s.id, title: `Low stock: ${s.product.name}`, desc: `${s.quantityOnHand - s.quantityReserved} available at ${s.warehouse.name}`, type: 'WARNING', time: s.updatedAt.toISOString() })),
    ];
    res.json({ success: true, data });
  } catch (error) { next(error); }
});
