import { Request, Response, NextFunction } from 'express';
import { ProcurementService } from './procurement.service';

export class ProcurementController {
  static async getPurchaseOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ProcurementService.getPurchaseOrders({
        status: req.query.status as string,
        vendorId: req.query.vendorId as string,
        departmentId: req.query.departmentId as string,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getPurchaseOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ProcurementService.getPurchaseOrderById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async createPurchaseOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ProcurementService.createPurchaseOrder(
        req.body,
        req.user!.id,
        req.id
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async approvePurchaseOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ProcurementService.approvePurchaseOrder(
        req.params.id,
        {
          id: req.user!.id,
          role: req.user!.role,
          approvalLimit: req.user!.approvalLimit,
        },
        req.body.comments,
        req.id
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async rejectPurchaseOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ProcurementService.rejectPurchaseOrder(
        req.params.id,
        req.user!.id,
        req.body.comments || 'Rejected',
        req.id
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
