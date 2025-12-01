import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

// Controllers
import {
  PlaysController,
  UsersController,
  WebhooksController,
  HealthController,
} from './infrastructure/http/controllers';

// Services
import { PlayService, UserService, WebhookService } from './application/services';

// Database entities
import {
  PlayEntity,
  UserEntity,
  BancaEntity,
  OutgoingRequestEntity,
  WebhookEventEntity,
} from './infrastructure/database/entities';

// Repositories
import {
  TypeOrmPlayRepository,
  TypeOrmUserRepository,
} from './infrastructure/database/repositories';

// Domain repository tokens
import { PLAY_REPOSITORY, USER_REPOSITORY } from './domain/repositories';

// Port tokens
import { EVENT_PUBLISHER, CACHE_PORT, BANCA_ADAPTER } from './ports/outgoing';

// Guards
import { JwtAuthGuard, IdempotencyGuard } from './infrastructure/http/guards';

// Middleware
import { RequestLoggingMiddleware } from './infrastructure/http/middleware';

// Adapters and Workers
import { MockBancaAdapter, ApiBancaAdapter } from './infrastructure/adapters';
import { InMemoryEventPublisher, PlayWorker } from './infrastructure/messaging';

// Mock Cache implementation for development
class MockCachePort {
  private cache = new Map<string, unknown>();
  private locks = new Set<string>();

  async get<T>(key: string): Promise<T | null> {
    return (this.cache.get(key) as T) || null;
  }
  async set<T>(key: string, value: T, _ttlSeconds?: number): Promise<void> {
    this.cache.set(key, value);
  }
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }
  async exists(key: string): Promise<boolean> {
    return this.cache.has(key);
  }
  async acquireLock(key: string, _ttlSeconds: number): Promise<boolean> {
    if (this.locks.has(key)) return false;
    this.locks.add(key);
    return true;
  }
  async releaseLock(key: string): Promise<void> {
    this.locks.delete(key);
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST', 'localhost'),
        port: configService.get<number>('DATABASE_PORT', 5432),
        username: configService.get<string>('DATABASE_USERNAME', 'lotolink'),
        password: configService.get<string>('DATABASE_PASSWORD', 'password'),
        database: configService.get<string>('DATABASE_NAME', 'lotolink_db'),
        entities: [PlayEntity, UserEntity, BancaEntity, OutgoingRequestEntity, WebhookEventEntity],
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      PlayEntity,
      UserEntity,
      BancaEntity,
      OutgoingRequestEntity,
      WebhookEventEntity,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'default_secret'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1h'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [PlaysController, UsersController, WebhooksController, HealthController],
  providers: [
    // Services
    PlayService,
    UserService,
    WebhookService,
    
    // Workers
    PlayWorker,
    
    // Guards
    JwtAuthGuard,
    IdempotencyGuard,
    
    // Repository bindings
    {
      provide: PLAY_REPOSITORY,
      useClass: TypeOrmPlayRepository,
    },
    {
      provide: USER_REPOSITORY,
      useClass: TypeOrmUserRepository,
    },
    
    // Banca Adapter - uses mock by default, switch to ApiBancaAdapter for production
    {
      provide: BANCA_ADAPTER,
      useFactory: (configService: ConfigService) => {
        const useMock = configService.get<string>('USE_MOCK_BANCA', 'true') === 'true';
        if (useMock) {
          return new MockBancaAdapter(configService);
        }
        return new ApiBancaAdapter(configService);
      },
      inject: [ConfigService],
    },
    
    // Event Publisher
    {
      provide: EVENT_PUBLISHER,
      useClass: InMemoryEventPublisher,
    },
    
    // Cache Port (mock implementation)
    {
      provide: CACHE_PORT,
      useClass: MockCachePort,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}
