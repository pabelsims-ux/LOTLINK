import { Injectable, CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { CachePort, CACHE_PORT } from '../../../ports/outgoing/cache.port';

@Injectable()
export class IdempotencyGuard implements CanActivate {
  constructor(
    @Inject(CACHE_PORT)
    private readonly cache: CachePort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.headers['idempotency-key'] || request.body?.requestId;

    if (!idempotencyKey) {
      return true; // No idempotency key, proceed normally
    }

    const cacheKey = `idempotency:${idempotencyKey}`;
    const lockAcquired = await this.cache.acquireLock(cacheKey, 30);

    if (!lockAcquired) {
      // Request is already being processed, but we still allow it
      // The service layer will handle returning the existing result
      return true;
    }

    return true;
  }
}
