import { IsString, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class WebhookConfirmationDto {
  @IsUUID('4')
  requestId!: string;

  @IsString()
  playIdBanca!: string;

  @IsString()
  ticketCode!: string;

  @IsString()
  status!: 'confirmed' | 'rejected';

  @IsOptional()
  @IsString()
  reason?: string;
}

export class WebhookResponseDto {
  success!: boolean;
  message!: string;
  processedAt!: Date;
}

export class PartnerPlayPushDto {
  @IsString()
  playId!: string;

  @IsString()
  bancaId!: string;

  @IsString()
  userId!: string;

  @IsString()
  lotteryId!: string;

  numbers!: string[];
  amount!: number;
  currency!: string;
}

export class PartnerPlayAckDto {
  @IsString()
  playId!: string;

  @IsBoolean()
  accepted!: boolean;

  @IsOptional()
  @IsString()
  ticketCode?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
