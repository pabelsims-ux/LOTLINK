import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { StructuredLogger } from '../../../infrastructure/logging';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger: StructuredLogger;

  constructor(private readonly configService: ConfigService) {
    this.logger = new StructuredLogger(configService);
    this.logger.setContext('HTTP');
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = req.headers['x-request-id'] as string || uuidv4();
    const startTime = Date.now();

    // Attach request ID to request for tracing
    req.headers['x-request-id'] = requestId;

    // Extract user ID if available from token (basic extraction)
    const userId = (req as unknown as { user?: { sub?: string } }).user?.sub;

    // Log request start
    this.logger.debug(`Request started`, {
      requestId,
      userId,
      method: req.method,
      path: req.originalUrl,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    // Log response on finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      this.logger.logRequest(
        req.method,
        req.originalUrl,
        res.statusCode,
        duration,
        {
          requestId,
          userId,
        },
      );
    });

    next();
  }
}
