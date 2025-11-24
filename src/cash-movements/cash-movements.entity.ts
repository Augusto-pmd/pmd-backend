import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Cashbox } from '../cashboxes/cashboxes.entity';
import { Currency } from '../common/enums/currency.enum';
import { CashMovementType } from '../common/enums/cash-movement-type.enum';
import { Expense } from '../expenses/expenses.entity';
import { Income } from '../incomes/incomes.entity';

@Entity('cash_movements')
export class CashMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  cashbox_id: string;

  @ManyToOne(() => Cashbox, (cashbox) => cashbox.movements, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cashbox_id' })
  cashbox: Cashbox;

  @Column({
    type: 'enum',
    enum: CashMovementType,
  })
  type: CashMovementType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: Currency,
  })
  currency: Currency;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'uuid', nullable: true })
  expense_id: string;

  @ManyToOne(() => Expense, { nullable: true })
  @JoinColumn({ name: 'expense_id' })
  expense: Expense;

  @Column({ type: 'uuid', nullable: true })
  income_id: string;

  @ManyToOne(() => Income, { nullable: true })
  @JoinColumn({ name: 'income_id' })
  income: Income;

  @Column({ type: 'date' })
  date: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

