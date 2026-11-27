import { Request, Response, NextFunction } from 'express';
import { ReportsService } from './reports.service';

export class ReportsController {
  static async getTrialBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ReportsService.getFinancialStatements(req.query.periodId as string);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getExecutiveAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ReportsService.getExecutiveAnalytics();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
