import { Request, Response, NextFunction } from 'express';
import { BillingService } from './billing.service';

export class BillingController {
  static async getInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await BillingService.getInvoices(
        req.query.type as any,
        req.query.status as string
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getInvoiceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await BillingService.getInvoiceById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async createAPInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await BillingService.createAPInvoice(req.body, req.user!.id, req.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async createARInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await BillingService.createARInvoice(req.body.soId, req.user!.id, req.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await BillingService.recordPayment(req.body, req.user!.id, req.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
