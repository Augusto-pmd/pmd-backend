import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Expense } from '../expenses/expenses.entity';

@Entity('val')
export class Val {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'uuid', unique: true })
  expense_id: string;

  @OneToOne(() => Expense, (expense) => expense.val)
  @JoinColumn({ name: 'expense_id' })
  expense: Expense;

  @Column({ type: 'varchar', length: 500, nullable: true })
  file_url: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

