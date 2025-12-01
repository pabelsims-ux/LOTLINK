import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { WebhookConfirmationDto, WebhookResponseDto } from '../dtos/webhook.dto';
import { PlayService } from './play.service';

@Injectable()
export class WebhookService {
  private readonly hmacSecret: string;
  private readonly timestampToleranceSeconds: number;

  constructor(
    private readonly playService: PlayService,
    private readonly configService: ConfigService,
  ) {
    this.hmacSecret = this.configService.get<string>('HMAC_SECRET', 'default_secret');
    this.timestampToleranceSeconds = this.configService.get<number>('HMAC_TIMESTAMP_TOLERANCE_SECONDS', 120);
  }

  async processPlayConfirmation(
    dto: WebhookConfirmationDto,
    signature: string,
    timestamp: string,
    body: string,
  ): Promise<WebhookResponseDto> {
    // Validate signature
    this.validateSignature(signature, timestamp, body);

    // Validate timestamp (replay protection)
    this.validateTimestamp(timestamp);

    // Process confirmation
    if (dto.status === 'confirmed') {
      await this.playService.confirmPlayByRequestId(dto.requestId, dto.playIdBanca, dto.ticketCode);
    } else if (dto.status === 'rejected') {
      await this.playService.rejectPlayByRequestId(dto.requestId, dto.reason);
    }

    return {
      success: true,
      message: `Play ${dto.status} successfully processed`,
      processedAt: new Date(),
    };
  }

  private validateSignature(signature: string, timestamp: string, body: string): void {
    const expectedSignature = this.calculateSignature('POST', '/webhooks/plays/confirmation', timestamp, body);
    
    if (signature !== expectedSignature) {
      throw new UnauthorizedException('Invalid signature');
    }
  }

  private validateTimestamp(timestamp: string): void {
    const requestTime = new Date(timestamp).getTime();
    const currentTime = Date.now();
    const tolerance = this.timestampToleranceSeconds * 1000;

    if (Math.abs(currentTime - requestTime) > tolerance) {
      throw new BadRequestException('Timestamp out of range');
    }
  }

  calculateSignature(method: string, path: string, timestamp: string, body: string): string {
    const signatureBase = `${method}${path}${timestamp}${body}`;
    const hmac = createHmac('sha256', this.hmacSecret);
    hmac.update(signatureBase);
    return hmac.digest('base64');
  }
}
