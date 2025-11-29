import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('outgoing_requests')
export class OutgoingRequestEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'request_id' })
  @Index()
  requestId!: string;

  @Column('uuid', { name: 'banca_id' })
  @Index()
  bancaId!: string;

  @Column('varchar')
  path!: string;

  @Column('jsonb')
  payload!: Record<string, unknown>;

  @Column('varchar', { default: 'pending' })
  @Index()
  status!: string;

  @Column('integer', { default: 0 })
  retries!: number;

  @Column('jsonb', { name: 'last_response', nullable: true })
  lastResponse?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
