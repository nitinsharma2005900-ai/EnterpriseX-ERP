import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export class AppError extends Error {
  statusCode: number;
  code?: string;
  details?: any;

  constructor(message: string, statusCode = 400, code?: string, details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const databaseStatus = ({ P2002: 409, P2003: 400, P2025: 404, P2034: 409 } as Record<string, number>)[err.code];
  const statusCode = databaseStatus || err.statusCode || (err.status ? Number(err.status) : 500);
  const code = databaseStatus ? ({ P2002: 'DUPLICATE_RECORD', P2003: 'INVALID_REFERENCE', P2025: 'NOT_FOUND', P2034: 'CONCURRENT_UPDATE' } as Record<string, string>)[err.code] : (err.code || 'INTERNAL_SERVER_ERROR');
  const message = databaseStatus ? ({ P2002: 'A record with this identifier already exists', P2003: 'Referenced record does not exist or is still in use', P2025: 'Record not found', P2034: 'Concurrent update; retry the request' } as Record<string, string>)[err.code] : statusCode >= 500 ? 'An unexpected server error occurred' : err.message || 'Invalid request';

  logger.error(message, {
    requestId: req.id,
    path: req.originalUrl,
    method: req.method,
    statusCode,
    code,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details: err.details || null,
      requestId: req.id,
    },
  });
}
