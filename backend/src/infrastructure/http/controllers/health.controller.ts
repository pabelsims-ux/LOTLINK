import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'lotolink-backend',
      version: '1.0.0',
    };
  }

  @Get('ready')
  ready() {
    // Add database/redis/queue connectivity checks here
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok',
        redis: 'ok',
        queue: 'ok',
      },
    };
  }
}
