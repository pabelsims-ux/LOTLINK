import {
  Controller,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from '../../../application/services/user.service';
import { ChargeWalletDto, WalletResponseDto } from '../../../application/dtos/user.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @Post(':userId/wallet/charge')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async chargeWallet(
    @Param('userId') userId: string,
    @Body() chargeWalletDto: ChargeWalletDto,
  ): Promise<WalletResponseDto> {
    return this.userService.chargeWallet(userId, chargeWalletDto);
  }

  @Post(':userId/wallet/debit')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async debitWallet(
    @Param('userId') userId: string,
    @Body() body: { amount: number },
  ): Promise<WalletResponseDto> {
    return this.userService.debitWallet(userId, body.amount);
  }
}
