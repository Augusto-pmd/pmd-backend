import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('exchange_rates')
@Index(['date'], { unique: true })
export class ExchangeRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date', unique: true })
  date: Date;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  rate_ars_to_usd: number;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  rate_usd_to_ars: number;

  @Column({ type: 'uuid' })
  created_by_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  created_by: User;

  @CreateDateColumn()
  created_at: Date;
}

