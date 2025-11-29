import { IsString, IsNumber, IsOptional, IsEmail, Min } from 'class-validator';

export class CreateUserDto {
  @IsString()
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class ChargeWalletDto {
  @IsNumber()
  @Min(1)
  amount!: number;

  @IsString()
  method!: 'card' | 'bank' | 'cash';

  @IsOptional()
  @IsString()
  transactionRef?: string;
}

export class WalletResponseDto {
  userId!: string;
  balance!: number;
  transactionId!: string;
  transactionType!: 'charge' | 'debit' | 'refund';
  amount!: number;
  timestamp!: Date;
}
