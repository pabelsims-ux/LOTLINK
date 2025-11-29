import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('bancas')
export class BancaEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar')
  @Index()
  name!: string;

  @Column('varchar', { name: 'integration_type' })
  integrationType!: string;

  @Column('varchar', { nullable: true })
  endpoint?: string;

  @Column('varchar', { name: 'auth_type' })
  authType!: string;

  @Column('varchar', { name: 'client_id', nullable: true })
  clientId?: string;

  @Column('varchar', { nullable: true })
  secret?: string;

  @Column('text', { name: 'public_key', nullable: true })
  publicKey?: string;

  @Column('integer', { name: 'sla_ms', default: 5000 })
  slaMs!: number;

  @Column('boolean', { name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
