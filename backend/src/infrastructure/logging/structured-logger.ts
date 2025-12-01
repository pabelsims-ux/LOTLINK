import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LogContext {
  requestId?: string;
  userId?: string;
  playId?: string;
  bancaId?: string;
  action?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: string;
  meta?: LogContext;
  stack?: string;
}

/**
 * Structured Logger for Lotolink
 * 
 * Provides JSON-formatted logs suitable for aggregation in ELK/CloudWatch/Datadog
 * Key features:
 * - Structured JSON output in production
 * - Human-readable output in development
 * - Context tracking (requestId, userId, etc.)
 * - Performance metrics logging
 */
@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLogger implements LoggerService {
  private context?: string;
  private readonly isProduction: boolean;
  private readonly logLevel: string;

  constructor(private readonly configService: ConfigService) {
    this.isProduction = configService.get<string>('NODE_ENV') === 'production';
    this.logLevel = configService.get<string>('LOG_LEVEL', 'debug');
  }

  setContext(context: string): this {
    this.context = context;
    return this;
  }

  log(message: string, contextOrMeta?: string | LogContext): void {
    this.writeLog('info', message, contextOrMeta);
  }

  error(message: string, trace?: string, contextOrMeta?: string | LogContext): void {
    this.writeLog('error', message, contextOrMeta, trace);
  }

  warn(message: string, contextOrMeta?: string | LogContext): void {
    this.writeLog('warn', message, contextOrMeta);
  }

  debug(message: string, contextOrMeta?: string | LogContext): void {
    if (!this.shouldLog('debug')) return;
    this.writeLog('debug', message, contextOrMeta);
  }

  verbose(message: string, contextOrMeta?: string | LogContext): void {
    if (!this.shouldLog('verbose')) return;
    this.writeLog('verbose', message, contextOrMeta);
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation: string, durationMs: number, meta?: LogContext): void {
    this.writeLog('info', `Performance: ${operation} completed in ${durationMs}ms`, {
      ...meta,
      operation,
      durationMs,
      type: 'performance',
    });
  }

  /**
   * Log API request/response
   */
  logRequest(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
    meta?: LogContext,
  ): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this.writeLog(level, `${method} ${path} ${statusCode} ${durationMs}ms`, {
      ...meta,
      method,
      path,
      statusCode,
      durationMs,
      type: 'request',
    });
  }

  /**
   * Log domain events
   */
  logEvent(eventType: string, payload: Record<string, unknown>, meta?: LogContext): void {
    this.writeLog('info', `Event: ${eventType}`, {
      ...meta,
      eventType,
      payload,
      type: 'event',
    });
  }

  /**
   * Log security events
   */
  logSecurity(action: string, success: boolean, meta?: LogContext): void {
    const level = success ? 'info' : 'warn';
    this.writeLog(level, `Security: ${action} - ${success ? 'SUCCESS' : 'FAILED'}`, {
      ...meta,
      action,
      success,
      type: 'security',
    });
  }

  /**
   * Log business metrics
   */
  logMetric(metricName: string, value: number, meta?: LogContext): void {
    this.writeLog('info', `Metric: ${metricName}=${value}`, {
      ...meta,
      metricName,
      metricValue: value,
      type: 'metric',
    });
  }

  private shouldLog(level: string): boolean {
    const levels = ['error', 'warn', 'info', 'debug', 'verbose'];
    const configLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= configLevelIndex;
  }

  private writeLog(
    level: string,
    message: string,
    contextOrMeta?: string | LogContext,
    stack?: string,
  ): void {
    const context = typeof contextOrMeta === 'string' ? contextOrMeta : this.context;
    const meta = typeof contextOrMeta === 'object' ? contextOrMeta : undefined;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      context,
      meta,
      stack,
    };

    if (this.isProduction) {
      // JSON format for production - easy to parse by log aggregators
      console.log(JSON.stringify(entry));
    } else {
      // Human-readable format for development
      const prefix = `[${entry.timestamp}] ${entry.level.padEnd(7)} [${entry.context || 'App'}]`;
      const metaStr = entry.meta ? ` ${JSON.stringify(entry.meta)}` : '';
      console.log(`${prefix} ${message}${metaStr}`);
      if (stack) {
        console.log(stack);
      }
    }
  }
}
