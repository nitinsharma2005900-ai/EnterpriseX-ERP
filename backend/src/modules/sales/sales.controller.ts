import { Request, Response, NextFunction } from 'express';
import { SalesService } from './sales.service';

export class SalesController {
  static async getSalesOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await SalesService.getSalesOrders(req.query.customerId as string);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getSalesOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await SalesService.getSalesOrderById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async createSalesOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await SalesService.createSalesOrder(req.body, req.user!.id, req.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async reserveStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await SalesService.reserveStock(
        req.params.id,
        req.body.warehouseId,
        req.user!.id,
        req.id
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async fulfillSalesOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await SalesService.fulfillSalesOrder(
        req.params.id,
        req.body.warehouseId,
        req.user!.id,
        req.id
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
