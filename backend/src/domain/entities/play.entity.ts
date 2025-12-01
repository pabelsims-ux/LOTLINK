import { v4 as uuidv4 } from 'uuid';
import { PlayStatus, BetType, Currency } from '../value-objects';

export interface PlayPayment {
  method: 'wallet' | 'card' | 'bank';
  walletTransactionId?: string;
  cardLast4?: string;
}

export interface PlayProps {
  id?: string;
  requestId: string;
  userId: string;
  lotteryId: string;
  numbers: string[];
  betType: BetType;
  amount: number;
  currency: Currency;
  payment: PlayPayment;
  status?: PlayStatus;
  playIdBanca?: string;
  ticketCode?: string;
  bancaId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Play {
  readonly id: string;
  readonly requestId: string;
  readonly userId: string;
  readonly lotteryId: string;
  readonly numbers: string[];
  readonly betType: BetType;
  readonly amount: number;
  readonly currency: Currency;
  readonly payment: PlayPayment;
  private _status: PlayStatus;
  private _playIdBanca?: string;
  private _ticketCode?: string;
  private _bancaId?: string;
  readonly createdAt: Date;
  private _updatedAt: Date;

  constructor(props: PlayProps) {
    this.id = props.id || uuidv4();
    this.requestId = props.requestId;
    this.userId = props.userId;
    this.lotteryId = props.lotteryId;
    this.numbers = props.numbers;
    this.betType = props.betType;
    this.amount = props.amount;
    this.currency = props.currency;
    this.payment = props.payment;
    this._status = props.status || PlayStatus.PENDING;
    this._playIdBanca = props.playIdBanca;
    this._ticketCode = props.ticketCode;
    this._bancaId = props.bancaId;
    this.createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  get status(): PlayStatus {
    return this._status;
  }

  get playIdBanca(): string | undefined {
    return this._playIdBanca;
  }

  get ticketCode(): string | undefined {
    return this._ticketCode;
  }

  get bancaId(): string | undefined {
    return this._bancaId;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  confirm(playIdBanca: string, ticketCode: string): void {
    if (this._status !== PlayStatus.PENDING && this._status !== PlayStatus.PROCESSING) {
      throw new Error(`Cannot confirm play with status ${this._status}`);
    }
    this._status = PlayStatus.CONFIRMED;
    this._playIdBanca = playIdBanca;
    this._ticketCode = ticketCode;
    this._updatedAt = new Date();
  }

  reject(reason?: string): void {
    if (this._status !== PlayStatus.PENDING && this._status !== PlayStatus.PROCESSING) {
      throw new Error(`Cannot reject play with status ${this._status}`);
    }
    this._status = PlayStatus.REJECTED;
    this._updatedAt = new Date();
  }

  fail(reason?: string): void {
    if (this._status !== PlayStatus.PENDING && this._status !== PlayStatus.PROCESSING) {
      throw new Error(`Cannot fail play with status ${this._status}`);
    }
    this._status = PlayStatus.FAILED;
    this._updatedAt = new Date();
  }

  markAsProcessing(): void {
    if (this._status !== PlayStatus.PENDING) {
      throw new Error(`Cannot mark as processing play with status ${this._status}`);
    }
    this._status = PlayStatus.PROCESSING;
    this._updatedAt = new Date();
  }

  assignToBanca(bancaId: string): void {
    this._bancaId = bancaId;
    this._updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.id,
      requestId: this.requestId,
      userId: this.userId,
      lotteryId: this.lotteryId,
      numbers: this.numbers,
      betType: this.betType,
      amount: this.amount,
      currency: this.currency,
      payment: this.payment,
      status: this._status,
      playIdBanca: this._playIdBanca,
      ticketCode: this._ticketCode,
      bancaId: this._bancaId,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
