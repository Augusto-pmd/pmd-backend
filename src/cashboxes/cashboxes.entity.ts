import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../users/users.entity';
import { CashboxStatus } from '../common/enums/cashbox-status.enum';
import { CashMovement } from '../cash-movements/cash-movements.entity';

@Entity('cashboxes')
export class Cashbox {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, (user) => user.cashboxes)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: CashboxStatus,
    default: CashboxStatus.OPEN,
  })
  status: CashboxStatus;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  opening_balance_ars: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  opening_balance_usd: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  closing_balance_ars: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  closing_balance_usd: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  difference_ars: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  difference_usd: number;

  @Column({ type: 'boolean', default: false })
  difference_approved: boolean;

  @Column({ type: 'uuid', nullable: true })
  difference_approved_by_id: string;

  @Column({ type: 'timestamp', nullable: true })
  difference_approved_at: Date;

  @Column({ type: 'date' })
  opening_date: Date;

  @Column({ type: 'date', nullable: true })
  closing_date: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => CashMovement, (movement) => movement.cashbox)
  movements: CashMovement[];
}

