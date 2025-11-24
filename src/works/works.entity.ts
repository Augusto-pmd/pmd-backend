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
import { Currency } from '../common/enums/currency.enum';
import { WorkStatus } from '../common/enums/work-status.enum';
import { WorkBudget } from '../work-budgets/work-budgets.entity';
import { Contract } from '../contracts/contracts.entity';
import { Expense } from '../expenses/expenses.entity';
import { Income } from '../incomes/incomes.entity';
import { Schedule } from '../schedule/schedule.entity';

@Entity('works')
export class Work {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  client: string;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'date' })
  start_date: Date;

  @Column({ type: 'date', nullable: true })
  end_date: Date;

  @Column({
    type: 'enum',
    enum: WorkStatus,
    default: WorkStatus.ACTIVE,
  })
  status: WorkStatus;

  @Column({
    type: 'enum',
    enum: Currency,
  })
  currency: Currency;

  @Column({ type: 'uuid', nullable: true })
  supervisor_id: string;

  @ManyToOne(() => User, (user) => user.supervised_works)
  @JoinColumn({ name: 'supervisor_id' })
  supervisor: User;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_budget: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_expenses: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_incomes: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  physical_progress: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  economic_progress: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  financial_progress: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => WorkBudget, (budget) => budget.work)
  budgets: WorkBudget[];

  @OneToMany(() => Contract, (contract) => contract.work)
  contracts: Contract[];

  @OneToMany(() => Expense, (expense) => expense.work)
  expenses: Expense[];

  @OneToMany(() => Income, (income) => income.work)
  incomes: Income[];

  @OneToMany(() => Schedule, (schedule) => schedule.work)
  schedules: Schedule[];
}

