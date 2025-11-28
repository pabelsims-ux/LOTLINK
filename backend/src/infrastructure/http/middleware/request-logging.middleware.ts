import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = req.headers['x-request-id'] as string || uuidv4();
    const startTime = Date.now();

    // Attach request ID to request for tracing
    req.headers['x-request-id'] = requestId;

    // Log request
    this.logger.log(
      `[${requestId}] ${req.method} ${req.originalUrl} - Start`,
    );

    // Log response on finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      this.logger.log(
        `[${requestId}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`,
      );
    });

    next();
  }
}
