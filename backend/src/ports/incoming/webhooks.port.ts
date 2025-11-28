import { WebhookConfirmationDto, WebhookResponseDto } from '../../application/dtos/webhook.dto';

export interface WebhooksPort {
  handlePlayConfirmation(
    dto: WebhookConfirmationDto,
    signature: string,
    timestamp: string,
    rawBody: string,
  ): Promise<WebhookResponseDto>;
}

export const WEBHOOKS_PORT = Symbol('WebhooksPort');
