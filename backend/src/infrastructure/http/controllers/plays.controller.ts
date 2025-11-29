import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { PlayService } from '../../../application/services/play.service';
import { CreatePlayDto, PlayResponseDto, GetPlayDto } from '../../../application/dtos/play.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { IdempotencyGuard } from '../guards/idempotency.guard';

@Controller('api/v1/plays')
export class PlaysController {
  constructor(private readonly playService: PlayService) {}

  @Post()
  @UseGuards(JwtAuthGuard, IdempotencyGuard)
  @HttpCode(HttpStatus.CREATED)
  async createPlay(
    @Body() createPlayDto: CreatePlayDto,
    @Headers('Idempotency-Key') idempotencyKey: string,
  ): Promise<PlayResponseDto> {
    // Validate that idempotency key matches request_id if both are provided
    if (idempotencyKey && idempotencyKey !== createPlayDto.requestId) {
      throw new BadRequestException(
        'Idempotency-Key header must match request_id in the body',
      );
    }
    return this.playService.createPlay(createPlayDto);
  }

  @Get(':playId')
  @UseGuards(JwtAuthGuard)
  async getPlay(@Param('playId') playId: string): Promise<GetPlayDto> {
    return this.playService.getPlayById(playId);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  async getPlaysByUser(
    @Param('userId') userId: string,
    @Query('limit') limit = 20,
    @Query('offset') offset = 0,
  ): Promise<GetPlayDto[]> {
    return this.playService.getPlaysByUserId(userId, limit, offset);
  }
}
