import { Request, Response, NextFunction } from 'express';
import { IntegrationsService } from './integrations.service';

export class IntegrationsController {
  static async sendEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { to, subject, body } = req.body;
      const data = await IntegrationsService.sendEmail(to, subject, body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static getEmailQueue(req: Request, res: Response): void {
    const data = IntegrationsService.getEmailQueue();
    res.json({ success: true, data });
  }

  static async simulateVendorDispatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await IntegrationsService.simulateVendorDispatch(req.body.poNumber);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  static async exportAccounting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const format = (req.query.format as 'json' | 'csv') || 'json';
      const result = await IntegrationsService.exportAccountingData(format);
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.data);
      } else {
        res.json({ success: true, ...result });
      }
    } catch (err) {
      next(err);
    }
  }

  static async importAccounting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await IntegrationsService.importAccountingData(req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
