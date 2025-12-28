import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Work } from '../works/works.entity';
import { Supplier } from '../suppliers/suppliers.entity';
import { Rubric } from '../rubrics/rubrics.entity';
import { User } from '../users/user.entity';
import { Currency } from '../common/enums/currency.enum';
import { ExpenseState } from '../common/enums/expense-state.enum';
import { DocumentType } from '../common/enums/document-type.enum';
import { Val } from '../val/val.entity';
import { AccountingRecord } from '../accounting/accounting.entity';
import { CashMovement } from '../cash-movements/cash-movements.entity';
import { Contract } from '../contracts/contracts.entity';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  work_id: string;

  @ManyToOne(() => Work, (work) => work.expenses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_id' })
  work: Work;

  @Column({ type: 'uuid', nullable: true })
  supplier_id: string;

  @ManyToOne(() => Supplier, (supplier) => supplier.expenses)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ type: 'uuid', nullable: true })
  contract_id: string;

  @ManyToOne(() => Contract, { nullable: true })
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;

  @Column({ type: 'uuid' })
  rubric_id: string;

  @ManyToOne(() => Rubric, (rubric) => rubric.expenses)
  @JoinColumn({ name: 'rubric_id' })
  rubric: Rubric;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: Currency,
  })
  currency: Currency;

  @Column({ type: 'date' })
  purchase_date: Date;

  @Column({
    type: 'enum',
    enum: DocumentType,
  })
  document_type: DocumentType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  document_number: string;

  @Column({
    type: 'enum',
    enum: ExpenseState,
    default: ExpenseState.PENDING,
  })
  state: ExpenseState;

  @Column({ type: 'varchar', length: 500, nullable: true })
  file_url: string;

  @Column({ type: 'text', nullable: true })
  observations: string;

  @Column({ type: 'uuid' })
  created_by_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  created_by: User;

  @Column({ type: 'uuid', nullable: true })
  validated_by_id: string;

  @Column({ type: 'timestamp', nullable: true })
  validated_at: Date;

  @OneToOne(() => Val, (val) => val.expense)
  val: Val;

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

  @Column({ type: 'boolean', default: false })
  is_post_closure: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

