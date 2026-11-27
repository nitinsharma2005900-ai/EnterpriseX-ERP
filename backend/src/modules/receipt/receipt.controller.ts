import { Request, Response, NextFunction } from 'express';
import { ReceiptService } from './receipt.service';

export class ReceiptController {
  static async getGoodsReceipts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ReceiptService.getGoodsReceipts(req.query.warehouseId as string);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getGoodsReceiptById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ReceiptService.getGoodsReceiptById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async createGoodsReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ReceiptService.createGoodsReceipt(
        req.body,
        req.user!.id,
        req.id
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
