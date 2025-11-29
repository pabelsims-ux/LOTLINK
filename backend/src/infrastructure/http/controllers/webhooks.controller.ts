import {
  Controller,
  Post,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { WebhookService } from '../../../application/services/webhook.service';
import { WebhookConfirmationDto, WebhookResponseDto } from '../../../application/dtos/webhook.dto';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('plays/confirmation')
  @HttpCode(HttpStatus.OK)
  async handlePlayConfirmation(
    @Body() dto: WebhookConfirmationDto,
    @Headers('X-Signature') signature: string,
    @Headers('X-Timestamp') timestamp: string,
    @Req() request: RawBodyRequest<Request>,
  ): Promise<WebhookResponseDto> {
    const rawBody = request.rawBody?.toString() || JSON.stringify(dto);
    return this.webhookService.processPlayConfirmation(dto, signature, timestamp, rawBody);
  }
}
