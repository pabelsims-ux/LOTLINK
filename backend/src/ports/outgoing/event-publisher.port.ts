import { DomainEvent } from '../../domain/events';

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishToQueue(queueName: string, event: DomainEvent): Promise<void>;
}

export const EVENT_PUBLISHER = Symbol('EventPublisher');
