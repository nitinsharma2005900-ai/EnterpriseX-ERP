import { Request, Response, NextFunction } from 'express';
import { CustomersService } from './customers.service';

export class CustomersController {
  static async getCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await CustomersService.getCustomers();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getCustomerById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await CustomersService.getCustomerById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async createCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await CustomersService.createCustomer(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
