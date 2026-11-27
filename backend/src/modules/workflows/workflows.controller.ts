import { Request, Response, NextFunction } from 'express';
import { WorkflowEngine } from './workflow.engine';

export class WorkflowController {
  static async runPurchaseToPay(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await WorkflowEngine.executePurchaseToPay(req.body, req.user!, req.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async runOrderToCash(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await WorkflowEngine.executeOrderToCash(req.body, req.user!, req.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
