export interface DomainEvent {
  eventType: string;
  timestamp: Date;
  payload: Record<string, unknown>;
}

export class PlayCreatedEvent implements DomainEvent {
  readonly eventType = 'play.created';
  readonly timestamp: Date;
  readonly payload: {
    playId: string;
    requestId: string;
    userId: string;
    lotteryId: string;
    amount: number;
  };

  constructor(playId: string, requestId: string, userId: string, lotteryId: string, amount: number) {
    this.timestamp = new Date();
    this.payload = { playId, requestId, userId, lotteryId, amount };
  }
}

export class PlayConfirmedEvent implements DomainEvent {
  readonly eventType = 'play.confirmed';
  readonly timestamp: Date;
  readonly payload: {
    playId: string;
    playIdBanca: string;
    ticketCode: string;
  };

  constructor(playId: string, playIdBanca: string, ticketCode: string) {
    this.timestamp = new Date();
    this.payload = { playId, playIdBanca, ticketCode };
  }
}

export class PlayRejectedEvent implements DomainEvent {
  readonly eventType = 'play.rejected';
  readonly timestamp: Date;
  readonly payload: {
    playId: string;
    reason?: string;
  };

  constructor(playId: string, reason?: string) {
    this.timestamp = new Date();
    this.payload = { playId, reason };
  }
}

export class PlayFailedEvent implements DomainEvent {
  readonly eventType = 'play.failed';
  readonly timestamp: Date;
  readonly payload: {
    playId: string;
    error: string;
    retryCount: number;
  };

  constructor(playId: string, error: string, retryCount: number) {
    this.timestamp = new Date();
    this.payload = { playId, error, retryCount };
  }
}
