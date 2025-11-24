import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AccountingType } from '../common/enums/accounting-type.enum';
import { Currency } from '../common/enums/currency.enum';
import { Expense } from '../expenses/expenses.entity';
import { Work } from '../works/works.entity';
import { Supplier } from '../suppliers/suppliers.entity';
import { MonthStatus } from '../common/enums/month-status.enum';

@Entity('accounting_records')
export class AccountingRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: AccountingType,
  })
  accounting_type: AccountingType;

  @Column({ type: 'uuid', nullable: true })
  expense_id: string;

  @ManyToOne(() => Expense, { nullable: true })
  @JoinColumn({ name: 'expense_id' })
  expense: Expense;

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

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'integer' })
  month: number;

  @Column({ type: 'integer' })
  year: number;

  @Column({
    type: 'enum',
    enum: MonthStatus,
    default: MonthStatus.OPEN,
  })
  month_status: MonthStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  document_number: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: Currency,
  })
  currency: Currency;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  vat_amount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  vat_rate: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  vat_perception: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  vat_withholding: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  iibb_perception: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  income_tax_withholding: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  file_url: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

