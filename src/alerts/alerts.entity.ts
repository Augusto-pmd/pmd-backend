import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AlertType } from '../common/enums/alert-type.enum';
import { AlertSeverity } from '../common/enums/alert-severity.enum';
import { User } from '../users/user.entity';
import { Work } from '../works/works.entity';
import { Supplier } from '../suppliers/suppliers.entity';
import { Expense } from '../expenses/expenses.entity';
import { Contract } from '../contracts/contracts.entity';
import { Cashbox } from '../cashboxes/cashboxes.entity';

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: AlertType,
  })
  type: AlertType;

  @Column({
    type: 'enum',
    enum: AlertSeverity,
    default: AlertSeverity.INFO,
  })
  severity: AlertSeverity;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'boolean', default: false })
  is_read: boolean;

  @Column({ type: 'uuid', nullable: true })
  user_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid', nullable: true })
  work_id: string;

  @ManyToOne(() => Work, { nullable: true })
  @JoinColumn({ name: 'work_id' })
  work: Work;

  @Column({ type: 'uuid', nullable: true })
  supplier_id: string;

  @ManyToOne(() => Supplier, { nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ type: 'uuid', nullable: true })
  expense_id: string;

  @ManyToOne(() => Expense, { nullable: true })
  @JoinColumn({ name: 'expense_id' })
  expense: Expense;

  @Column({ type: 'uuid', nullable: true })
  contract_id: string;

  @ManyToOne(() => Contract, { nullable: true })
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;

  @Column({ type: 'uuid', nullable: true })
  cashbox_id: string;

  @ManyToOne(() => Cashbox, { nullable: true })
  @JoinColumn({ name: 'cashbox_id' })
  cashbox: Cashbox;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

