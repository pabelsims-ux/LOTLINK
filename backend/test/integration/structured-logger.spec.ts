import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StructuredLogger, LogContext } from '../../src/infrastructure/logging/structured-logger';

describe('StructuredLogger', () => {
  let logger: StructuredLogger;
  let consoleSpy: jest.SpyInstance;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      if (key === 'NODE_ENV') return 'development';
      if (key === 'LOG_LEVEL') return 'debug';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StructuredLogger,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    logger = await module.resolve<StructuredLogger>(StructuredLogger);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('basic logging', () => {
    it('should log info messages', () => {
      logger.setContext('TestContext');
      logger.log('Test info message');

      expect(consoleSpy).toHaveBeenCalled();
      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).toContain('INFO');
      expect(logOutput).toContain('Test info message');
      expect(logOutput).toContain('TestContext');
    });

    it('should log warn messages', () => {
      logger.warn('Test warning');

      expect(consoleSpy).toHaveBeenCalled();
      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).toContain('WARN');
      expect(logOutput).toContain('Test warning');
    });

    it('should log error messages with stack trace', () => {
      logger.error('Test error', 'Stack trace here');

      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy.mock.calls[0][0]).toContain('ERROR');
      expect(consoleSpy.mock.calls[1][0]).toContain('Stack trace here');
    });

    it('should log debug messages', () => {
      logger.debug('Debug message');

      expect(consoleSpy).toHaveBeenCalled();
      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).toContain('DEBUG');
    });
  });

  describe('context and metadata', () => {
    it('should include context in log output', () => {
      logger.setContext('MyService');
      logger.log('Message with context');

      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).toContain('[MyService]');
    });

    it('should include metadata in log output', () => {
      const meta: LogContext = {
        requestId: 'req-123',
        userId: 'user-456',
      };

      logger.log('Message with meta', meta);

      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).toContain('req-123');
      expect(logOutput).toContain('user-456');
    });
  });

  describe('specialized logging methods', () => {
    it('should log performance metrics', () => {
      logger.logPerformance('database_query', 150, { query: 'SELECT *' });

      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).toContain('Performance');
      expect(logOutput).toContain('150ms');
    });

    it('should log request metrics', () => {
      logger.logRequest('GET', '/api/users', 200, 50, { requestId: 'req-123' });

      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).toContain('GET');
      expect(logOutput).toContain('/api/users');
      expect(logOutput).toContain('200');
      expect(logOutput).toContain('50ms');
    });

    it('should log security events', () => {
      logger.logSecurity('login_attempt', true, { userId: 'user-123' });

      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).toContain('Security');
      expect(logOutput).toContain('SUCCESS');
    });

    it('should log failed security events as warnings', () => {
      logger.logSecurity('login_attempt', false, { userId: 'user-123' });

      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).toContain('WARN');
      expect(logOutput).toContain('FAILED');
    });

    it('should log domain events', () => {
      logger.logEvent('play.created', { playId: 'play-123' });

      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).toContain('Event');
      expect(logOutput).toContain('play.created');
    });

    it('should log business metrics', () => {
      logger.logMetric('plays_created', 42, { bancaId: 'banca-001' });

      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).toContain('Metric');
      expect(logOutput).toContain('plays_created=42');
    });
  });

  describe('production mode', () => {
    let productionLogger: StructuredLogger;

    beforeEach(async () => {
      const prodConfigService = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'NODE_ENV') return 'production';
          if (key === 'LOG_LEVEL') return 'info';
          return defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StructuredLogger,
          {
            provide: ConfigService,
            useValue: prodConfigService,
          },
        ],
      }).compile();

      productionLogger = await module.resolve<StructuredLogger>(StructuredLogger);
    });

    it('should output JSON in production mode', () => {
      productionLogger.log('Production message');

      const logOutput = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);
      expect(parsed.level).toBe('INFO');
      expect(parsed.message).toBe('Production message');
      expect(parsed.timestamp).toBeDefined();
    });

    it('should not log debug messages in production with info level', () => {
      consoleSpy.mockClear();
      productionLogger.debug('Debug message');

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });
});
