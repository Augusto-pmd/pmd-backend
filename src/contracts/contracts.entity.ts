import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Work } from '../works/works.entity';
import { Supplier } from '../suppliers/suppliers.entity';
import { Rubric } from '../rubrics/rubrics.entity';
import { User } from '../users/user.entity';
import { Currency } from '../common/enums/currency.enum';
import { ContractStatus } from '../common/enums/contract-status.enum';

@Entity('contracts')
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  work_id: string;

  @ManyToOne(() => Work, (work) => work.contracts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_id' })
  work: Work;

  @Column({ type: 'uuid' })
  supplier_id: string;

  @ManyToOne(() => Supplier, (supplier) => supplier.contracts)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ type: 'uuid' })
  rubric_id: string;

  @ManyToOne(() => Rubric, (rubric) => rubric.contracts)
  @JoinColumn({ name: 'rubric_id' })
  rubric: Rubric;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount_total: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  amount_executed: number;

  @Column({
    type: 'enum',
    enum: Currency,
  })
  currency: Currency;

  @Column({ type: 'varchar', length: 500, nullable: true })
  file_url: string;

  @Column({ type: 'text', nullable: true })
  payment_terms: string;

  @Column({ type: 'boolean', default: false })
  is_blocked: boolean;

  @Column({
    type: 'enum',
    enum: ContractStatus,
    default: ContractStatus.PENDING,
  })
  status: ContractStatus;

  @Column({ type: 'text', nullable: true })
  observations: string;

  @Column({ type: 'date', nullable: true })
  validity_date: Date;

  @Column({ type: 'text', nullable: true })
  scope: string;

  @Column({ type: 'text', nullable: true })
  specifications: string;

  @Column({ type: 'uuid', nullable: true })
  closed_by_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'closed_by_id' })
  closed_by: User;

  @Column({ type: 'timestamp', nullable: true })
  closed_at: Date;

  @Column({ type: 'date', nullable: true })
  start_date: Date;

  @Column({ type: 'date', nullable: true })
  end_date: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

