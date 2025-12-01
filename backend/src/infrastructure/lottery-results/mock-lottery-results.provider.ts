import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LotteryResultsProvider,
  LotteryResult,
  LotteryResultsQuery,
} from './lottery-results.port';

/**
 * Mock Lottery Results Provider for development and testing
 */
@Injectable()
export class MockLotteryResultsProvider implements LotteryResultsProvider {
  private readonly logger = new Logger(MockLotteryResultsProvider.name);
  private readonly mockResults: Map<string, LotteryResult[]> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.logger.log('MockLotteryResultsProvider initialized - using simulated results');
    this.generateMockResults();
  }

  private generateMockResults(): void {
    const lotteries = ['loteria_nacional', 'leidsa', 'loteka', 'real'];
    const today = new Date();

    lotteries.forEach(lotteryId => {
      const results: LotteryResult[] = [];
      
      for (let i = 0; i < 7; i++) {
        const drawDate = new Date(today);
        drawDate.setDate(drawDate.getDate() - i);
        
        results.push({
          lotteryId,
          lotteryName: this.getLotteryName(lotteryId),
          drawDate,
          drawNumber: `${2024}${String(365 - i).padStart(3, '0')}`,
          winningNumbers: this.generateRandomNumbers(3),
          verified: true,
          source: 'mock',
        });
      }
      
      this.mockResults.set(lotteryId, results);
    });
  }

  private getLotteryName(lotteryId: string): string {
    const names: Record<string, string> = {
      loteria_nacional: 'Lotería Nacional',
      leidsa: 'LEIDSA',
      loteka: 'Loteka',
      real: 'La Primera (Real)',
    };
    return names[lotteryId] || lotteryId;
  }

  private generateRandomNumbers(count: number): string[] {
    const numbers: string[] = [];
    while (numbers.length < count) {
      const num = String(Math.floor(Math.random() * 100)).padStart(2, '0');
      if (!numbers.includes(num)) {
        numbers.push(num);
      }
    }
    return numbers.sort();
  }

  async getLatestResults(lotteryId: string): Promise<LotteryResult | null> {
    this.logger.log(`[MOCK] Fetching latest results for lottery ${lotteryId}`);
    const results = this.mockResults.get(lotteryId);
    return results?.[0] || null;
  }

  async getResultsByDate(lotteryId: string, date: Date): Promise<LotteryResult | null> {
    this.logger.log(`[MOCK] Fetching results for lottery ${lotteryId} on ${date.toISOString()}`);
    const results = this.mockResults.get(lotteryId) || [];
    return results.find(r => 
      r.drawDate.toDateString() === date.toDateString()
    ) || null;
  }

  async queryResults(query: LotteryResultsQuery): Promise<LotteryResult[]> {
    this.logger.log(`[MOCK] Querying results with filters: ${JSON.stringify(query)}`);
    
    let results: LotteryResult[] = [];
    
    if (query.lotteryId) {
      results = this.mockResults.get(query.lotteryId) || [];
    } else {
      this.mockResults.forEach(r => results.push(...r));
    }

    if (query.fromDate) {
      results = results.filter(r => r.drawDate >= query.fromDate!);
    }
    
    if (query.toDate) {
      results = results.filter(r => r.drawDate <= query.toDate!);
    }

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  async checkWinner(lotteryId: string, drawDate: Date, numbers: string[]): Promise<{
    isWinner: boolean;
    matchedNumbers: string[];
    prizeCategory?: string;
    estimatedPrize?: number;
  }> {
    this.logger.log(`[MOCK] Checking winner for lottery ${lotteryId}, numbers: ${numbers.join(', ')}`);

    const result = await this.getResultsByDate(lotteryId, drawDate);
    
    if (!result) {
      return {
        isWinner: false,
        matchedNumbers: [],
      };
    }

    const matchedNumbers = numbers.filter(n => result.winningNumbers.includes(n));
    const isWinner = matchedNumbers.length > 0;

    let prizeCategory: string | undefined;
    let estimatedPrize: number | undefined;

    if (matchedNumbers.length === 3) {
      prizeCategory = 'Tripleta';
      estimatedPrize = 50000;
    } else if (matchedNumbers.length === 2) {
      prizeCategory = 'Pale';
      estimatedPrize = 500;
    } else if (matchedNumbers.length === 1) {
      prizeCategory = 'Quiniela';
      estimatedPrize = 50;
    }

    return {
      isWinner,
      matchedNumbers,
      prizeCategory,
      estimatedPrize,
    };
  }

  async getSupportedLotteries(): Promise<{
    id: string;
    name: string;
    country: string;
    drawSchedule: string;
  }[]> {
    return [
      { id: 'loteria_nacional', name: 'Lotería Nacional', country: 'DO', drawSchedule: 'Daily' },
      { id: 'leidsa', name: 'LEIDSA', country: 'DO', drawSchedule: 'Various' },
      { id: 'loteka', name: 'Loteka', country: 'DO', drawSchedule: 'Daily' },
      { id: 'real', name: 'La Primera (Real)', country: 'DO', drawSchedule: 'Daily' },
    ];
  }

  async isHealthy(): Promise<boolean> {
    return true; // Mock is always healthy
  }
}
