import { z, ZodType } from 'zod';
import { RequestHandler } from 'express';

export const id = z.string().min(1).max(120);
export const text = z.string().trim().min(1).max(500);
export const positive = z.number().finite().positive().max(1e9);
export const money = z.number().finite().nonnegative().max(1e9);
export const rate = z.number().finite().min(0).max(1).optional();
export const orderItem = z.object({ productId: id, quantityOrdered: positive, unitPrice: money, taxRate: rate });
export const items = <T extends ZodType>(item: T) => z.array(item).min(1).max(100);
export const validate = (schema: ZodType): RequestHandler => {
  const handler: RequestHandler = (req, _res, next) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return next(Object.assign(new Error('Invalid request data'), { statusCode: 400, code: 'VALIDATION_ERROR', details: parsed.error.flatten() }));
  req.body = parsed.data;
  next();
  };
  (handler as any).schema = schema;
  return handler;
};
export { z };
