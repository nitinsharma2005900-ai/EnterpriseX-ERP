import { Request, Response, NextFunction } from 'express';
import { HealthService } from './health.service';
import { prisma } from '../../config/prisma';

export class HealthController {
  static async getHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await HealthService.getHealthStatus();
      res.status(data.status === 'HEALTHY' ? 200 : 503).json(data);
    } catch (err) {
      next(err);
    }
  }

  static async runDiagnostics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await HealthService.runDiagnostics();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getIncidents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await prisma.systemIncident.findMany({
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async simulateIncident(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await HealthService.simulateIncident(req.body.type || 'LEDGER_IMBALANCE');
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async resolveIncident(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await HealthService.resolveIncident(req.params.id, req.user?.id || 'admin', req.body.notes);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
