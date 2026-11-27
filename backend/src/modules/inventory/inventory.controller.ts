import { Request, Response, NextFunction } from 'express';
import { InventoryService } from './inventory.service';

export class InventoryController {
  static async getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await InventoryService.getProducts();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await InventoryService.getProductById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await InventoryService.createProduct(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getWarehouses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await InventoryService.getWarehouses();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getStockLevels(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await InventoryService.getStockLevels(req.query.warehouseId as string);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getStockMovements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await InventoryService.getStockMovements(
        req.query.productId as string,
        req.query.warehouseId as string
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async adjustStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await InventoryService.adjustStock({
        productId: req.body.productId,
        warehouseId: req.body.warehouseId,
        quantityDelta: Number(req.body.quantityDelta),
        notes: req.body.notes,
        userId: req.user!.id,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
