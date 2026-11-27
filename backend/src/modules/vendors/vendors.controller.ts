import { Request, Response, NextFunction } from 'express';
import { VendorsService } from './vendors.service';

export class VendorsController {
  static async getVendors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await VendorsService.getVendors();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getVendorById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await VendorsService.getVendorById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async createVendor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await VendorsService.createVendor(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async updateVendor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await VendorsService.updateVendor(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
