import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventPublisher } from '../../ports/outgoing/event-publisher.port';
import { DomainEvent } from '../../domain/events';

/**
 * In-memory Event Publisher for development and simple deployments
 * For production, use RabbitMQ or Kafka implementation
 */
@Injectable()
export class InMemoryEventPublisher implements EventPublisher, OnModuleDestroy {
  private readonly logger = new Logger(InMemoryEventPublisher.name);
  private readonly handlers: Map<string, ((event: DomainEvent) => Promise<void>)[]> = new Map();
  private readonly eventQueue: DomainEvent[] = [];
  private isProcessing = false;

  constructor(private readonly configService: ConfigService) {
    this.logger.log('InMemoryEventPublisher initialized');
  }

  async publish(event: DomainEvent): Promise<void> {
    this.eventQueue.push(event);
    this.logger.log(`Event queued: ${event.type}`);

    // Process asynchronously
    setImmediate(() => this.processQueue());
  }

  async publishToQueue(queueName: string, event: DomainEvent): Promise<void> {
    this.logger.log(`Event published to queue ${queueName}: ${event.type}`);
    await this.publish(event);
  }

  subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
    this.logger.log(`Handler subscribed to: ${eventType}`);
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (!event) continue;

      const handlers = this.handlers.get(event.type) || [];
      for (const handler of handlers) {
        try {
          await handler(event);
        } catch (error) {
          this.logger.error(`Error processing event ${event.type}: ${error}`);
        }
      }
    }

    this.isProcessing = false;
  }

  onModuleDestroy(): void {
    this.eventQueue.length = 0;
    this.handlers.clear();
    this.logger.log('InMemoryEventPublisher destroyed');
  }
}
