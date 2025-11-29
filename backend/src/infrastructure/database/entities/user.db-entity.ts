import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { unique: true })
  @Index()
  phone!: string;

  @Column('varchar', { nullable: true })
  @Index()
  email?: string;

  @Column('varchar', { nullable: true })
  name?: string;

  @Column('decimal', { name: 'wallet_balance', precision: 12, scale: 2, default: 0 })
  walletBalance!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
