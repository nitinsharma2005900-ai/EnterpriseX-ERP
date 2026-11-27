import { Request, Response, NextFunction } from 'express';
import { AccountsService } from './accounts.service';

export class AccountsController {
  static async getChartOfAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AccountsService.getChartOfAccounts();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async createAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AccountsService.createAccount(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getPeriods(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AccountsService.getFinancialPeriods();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async createPeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AccountsService.createFinancialPeriod({
        name: req.body.name,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
      });
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async closePeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AccountsService.closeFinancialPeriod(req.params.id, req.user!.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getJournalEntries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AccountsService.getJournalEntries({
        periodId: req.query.periodId as string,
        referenceType: req.query.referenceType as string,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async postJournalEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AccountsService.createJournalEntry(
        {
          ...req.body,
          createdById: req.user!.id,
          date: req.body.date ? new Date(req.body.date) : new Date(),
        },
        req.id
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getGeneralLedger(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AccountsService.getGeneralLedger();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
