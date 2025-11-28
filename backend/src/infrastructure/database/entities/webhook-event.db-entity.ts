import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('webhook_events')
export class WebhookEventEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar')
  @Index()
  source!: string;

  @Column('varchar', { name: 'event_type' })
  @Index()
  eventType!: string;

  @Column('jsonb')
  payload!: Record<string, unknown>;

  @Column('boolean', { name: 'signature_valid' })
  signatureValid!: boolean;

  @Column('boolean', { default: false })
  @Index()
  processed!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
