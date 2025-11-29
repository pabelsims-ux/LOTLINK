export interface BancaPlayRequest {
  requestId: string;
  play: {
    lotteryId: string;
    numbers: string[];
    betType: string;
    amount: number;
  };
  payment: {
    method: string;
    transactionId?: string;
  };
  user: {
    userId: string;
    phone?: string;
  };
}

export interface BancaPlayResponse {
  status: 'confirmed' | 'accepted' | 'rejected' | 'pending';
  playIdBanca?: string;
  ticketCode?: string;
  message?: string;
}

export interface BancaAdapter {
  registerPlay(request: BancaPlayRequest): Promise<BancaPlayResponse>;
  checkPlayStatus(playIdBanca: string): Promise<BancaPlayResponse>;
  isHealthy(): Promise<boolean>;
}

export const BANCA_ADAPTER = Symbol('BancaAdapter');
