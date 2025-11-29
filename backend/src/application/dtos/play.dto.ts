import { IsString, IsArray, IsNumber, IsEnum, IsOptional, IsUUID, ValidateNested, Min, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { BetType, Currency } from '../../domain/value-objects';

export class PaymentDto {
  @IsString()
  method!: 'wallet' | 'card' | 'bank';

  @IsOptional()
  @IsString()
  walletTransactionId?: string;

  @IsOptional()
  @IsString()
  cardLast4?: string;
}

export class CreatePlayDto {
  @IsUUID('4')
  requestId!: string;

  @IsString()
  userId!: string;

  @IsString()
  lotteryId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  numbers!: string[];

  @IsEnum(BetType)
  betType!: BetType;

  @IsNumber()
  @Min(1)
  amount!: number;

  @IsEnum(Currency)
  currency!: Currency;

  @ValidateNested()
  @Type(() => PaymentDto)
  payment!: PaymentDto;

  @IsOptional()
  @IsString()
  bancaId?: string;
}

export class PlayResponseDto {
  playId!: string;
  status!: string;
  estimatedConfirmation?: string;
  ticketCode?: string;
  createdAt!: Date;
}

export class GetPlayDto {
  playId!: string;
  requestId!: string;
  userId!: string;
  lotteryId!: string;
  numbers!: string[];
  betType!: string;
  amount!: number;
  currency!: string;
  status!: string;
  playIdBanca?: string;
  ticketCode?: string;
  bancaId?: string;
  createdAt!: Date;
  updatedAt!: Date;
}
