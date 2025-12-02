import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { StructuredLogger } from '../../../infrastructure/logging';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory rate limiting middleware.
 * 
 * For production, consider using Redis-based rate limiting for distributed systems.
 * This implementation is suitable for single-instance deployments or as a first line of defense.
 * 
 * Configuration (via environment variables):
 * - RATE_LIMIT_WINDOW_MS: Time window in milliseconds (default: 60000 = 1 minute)
 * - RATE_LIMIT_MAX_REQUESTS: Max requests per window (default: 100)
 * - RATE_LIMIT_WEBHOOK_MAX: Max webhook requests per window (default: 1000)
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger: StructuredLogger;
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly defaultConfig: RateLimitConfig;
  private readonly webhookConfig: RateLimitConfig;
  private readonly cleanupIntervalMs: number;

  constructor(private readonly configService: ConfigService) {
    this.logger = new StructuredLogger(configService);
    this.logger.setContext('RateLimit');

    // Default rate limit configuration
    this.defaultConfig = {
      windowMs: this.configService.get<number>('RATE_LIMIT_WINDOW_MS', 60000),
      maxRequests: this.configService.get<number>('RATE_LIMIT_MAX_REQUESTS', 100),
    };

    // Webhook endpoints have higher limits (bancas need to send many confirmations)
    this.webhookConfig = {
      windowMs: this.configService.get<number>('RATE_LIMIT_WINDOW_MS', 60000),
      maxRequests: this.configService.get<number>('RATE_LIMIT_WEBHOOK_MAX', 1000),
    };

    // Configurable cleanup interval (default: 60 seconds)
    this.cleanupIntervalMs = this.configService.get<number>('RATE_LIMIT_CLEANUP_INTERVAL_MS', 60000);

    // Cleanup expired entries periodically
    setInterval(() => this.cleanup(), this.cleanupIntervalMs);
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const clientKey = this.getClientKey(req);
    const config = this.getConfigForPath(req.path);
    const now = Date.now();

    let entry = this.store.get(clientKey);

    // Reset if window has passed
    if (!entry || now >= entry.resetAt) {
      entry = {
        count: 0,
        resetAt: now + config.windowMs,
      };
    }

    entry.count++;
    this.store.set(clientKey, entry);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - entry.count).toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000).toString());

    if (entry.count > config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());

      this.logger.warn('Rate limit exceeded', {
        clientKey,
        path: req.path,
        count: entry.count,
        limit: config.maxRequests,
      });

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please try again later.',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }

  /**
   * Get a unique key for the client based on IP and optionally user ID.
   */
  private getClientKey(req: Request): string {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = (req as unknown as { user?: { sub?: string } }).user?.sub;
    
    // Use user ID if available for more accurate limiting
    if (userId) {
      return `user:${userId}`;
    }
    
    // Fall back to IP-based limiting
    return `ip:${ip}`;
  }

  /**
   * Get rate limit configuration based on the request path.
   */
  private getConfigForPath(path: string): RateLimitConfig {
    // Webhook endpoints have higher limits
    if (path.startsWith('/webhooks/')) {
      return this.webhookConfig;
    }

    // Health checks should not be rate limited aggressively
    if (path === '/health' || path === '/ready') {
      return {
        windowMs: this.defaultConfig.windowMs,
        maxRequests: 1000,
      };
    }

    return this.defaultConfig;
  }

  /**
   * Cleanup expired entries from the store.
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetAt) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired rate limit entries`);
    }
  }
}
