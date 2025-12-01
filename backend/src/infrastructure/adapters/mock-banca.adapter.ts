import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BancaAdapter,
  BancaPlayRequest,
  BancaPlayResponse,
} from '../../ports/outgoing/banca-adapter.port';

/**
 * Mock Banca Adapter for development and testing
 * Simulates banca responses without making real API calls
 */
@Injectable()
export class MockBancaAdapter implements BancaAdapter {
  private readonly logger = new Logger(MockBancaAdapter.name);
  private readonly plays: Map<string, BancaPlayResponse> = new Map();
  private playCounter = 0;

  constructor(private readonly configService: ConfigService) {
    this.logger.log('MockBancaAdapter initialized - using simulated responses');
  }

  async registerPlay(request: BancaPlayRequest): Promise<BancaPlayResponse> {
    this.playCounter++;
    const playIdBanca = `BANCA-${Date.now()}-${this.playCounter}`;
    const ticketCode = `TKT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    // Simulate some processing time
    await this.delay(500);

    // 90% success rate simulation
    const isSuccess = Math.random() > 0.1;

    const response: BancaPlayResponse = isSuccess
      ? {
          status: 'confirmed',
          playIdBanca,
          ticketCode,
          message: 'Play registered successfully',
        }
      : {
          status: 'rejected',
          message: 'Insufficient funds at banca or numbers not available',
        };

    this.plays.set(playIdBanca, response);
    this.logger.log(`Mock banca response for ${request.requestId}: ${response.status}`);

    return response;
  }

  async checkPlayStatus(playIdBanca: string): Promise<BancaPlayResponse> {
    await this.delay(200);

    const existingPlay = this.plays.get(playIdBanca);
    if (existingPlay) {
      return existingPlay;
    }

    return {
      status: 'pending',
      playIdBanca,
      message: 'Play not found or still processing',
    };
  }

  async isHealthy(): Promise<boolean> {
    // Mock is always healthy
    return true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
