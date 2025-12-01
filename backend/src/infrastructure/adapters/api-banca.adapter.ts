import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import {
  BancaAdapter,
  BancaPlayRequest,
  BancaPlayResponse,
} from '../../ports/outgoing/banca-adapter.port';

/**
 * API Adapter for bancas that support direct API integration
 * Uses HMAC-SHA256 for request signing
 */
@Injectable()
export class ApiBancaAdapter implements BancaAdapter {
  private readonly logger = new Logger(ApiBancaAdapter.name);
  private readonly apiUrl: string;
  private readonly hmacSecret: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('BANCA_API_URL', 'http://localhost:4000');
    this.hmacSecret = this.configService.get<string>('BANCA_HMAC_SECRET', 'default_banca_secret');
    this.timeoutMs = this.configService.get<number>('BANCA_TIMEOUT_MS', 30000);
  }

  async registerPlay(request: BancaPlayRequest): Promise<BancaPlayResponse> {
    const timestamp = new Date().toISOString();
    const body = JSON.stringify(request);
    const signature = this.calculateSignature('POST', '/v1/plays/register', timestamp, body);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(`${this.apiUrl}/v1/plays/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': signature,
          'X-Timestamp': timestamp,
          'X-Request-Id': request.requestId,
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Banca API error: ${response.status} - ${errorText}`);
        return {
          status: 'rejected',
          message: `Banca rejected: ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        status: data.status || 'accepted',
        playIdBanca: data.play_id_banca || data.playIdBanca,
        ticketCode: data.ticket_code || data.ticketCode,
        message: data.message,
      };
    } catch (error) {
      this.logger.error(`Failed to register play with banca: ${error}`);
      return {
        status: 'pending',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async checkPlayStatus(playIdBanca: string): Promise<BancaPlayResponse> {
    const timestamp = new Date().toISOString();
    const signature = this.calculateSignature('GET', `/v1/plays/${playIdBanca}`, timestamp, '');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(`${this.apiUrl}/v1/plays/${playIdBanca}`, {
        method: 'GET',
        headers: {
          'X-Signature': signature,
          'X-Timestamp': timestamp,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          status: 'pending',
          message: `Status check failed: ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        status: data.status,
        playIdBanca: playIdBanca,
        ticketCode: data.ticket_code || data.ticketCode,
        message: data.message,
      };
    } catch (error) {
      this.logger.error(`Failed to check play status: ${error}`);
      return {
        status: 'pending',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.apiUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  private calculateSignature(method: string, path: string, timestamp: string, body: string): string {
    const signatureBase = `${method}${path}${timestamp}${body}`;
    const hmac = createHmac('sha256', this.hmacSecret);
    hmac.update(signatureBase);
    return hmac.digest('base64');
  }
}
