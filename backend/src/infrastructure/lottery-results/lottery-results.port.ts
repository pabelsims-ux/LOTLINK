/**
 * Lottery Results Provider Port
 * Interface for fetching official lottery results from a provider
 */
export interface LotteryResult {
  lotteryId: string;
  lotteryName: string;
  drawDate: Date;
  drawNumber: string;
  winningNumbers: string[];
  bonusNumbers?: string[];
  jackpot?: number;
  currency?: string;
  verified: boolean;
  source: string;
}

export interface LotteryResultsQuery {
  lotteryId?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
}

export interface LotteryResultsProvider {
  /**
   * Get the latest results for a specific lottery
   */
  getLatestResults(lotteryId: string): Promise<LotteryResult | null>;

  /**
   * Get results for a specific draw date
   */
  getResultsByDate(lotteryId: string, date: Date): Promise<LotteryResult | null>;

  /**
   * Query multiple results
   */
  queryResults(query: LotteryResultsQuery): Promise<LotteryResult[]>;

  /**
   * Check if numbers match winning numbers (for prize verification)
   */
  checkWinner(lotteryId: string, drawDate: Date, numbers: string[]): Promise<{
    isWinner: boolean;
    matchedNumbers: string[];
    prizeCategory?: string;
    estimatedPrize?: number;
  }>;

  /**
   * Get list of supported lotteries
   */
  getSupportedLotteries(): Promise<{
    id: string;
    name: string;
    country: string;
    drawSchedule: string;
  }[]>;

  /**
   * Verify provider connectivity
   */
  isHealthy(): Promise<boolean>;
}

export const LOTTERY_RESULTS_PROVIDER = Symbol('LotteryResultsProvider');
