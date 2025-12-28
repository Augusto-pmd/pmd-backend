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
import { Currency } from '../common/enums/currency.enum';
import { IncomeType } from '../common/enums/income-type.enum';
import { PaymentMethod } from '../common/enums/payment-method.enum';

@Entity('incomes')
export class Income {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  work_id: string;

  @ManyToOne(() => Work, (work) => work.incomes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_id' })
  work: Work;

  @Column({
    type: 'enum',
    enum: IncomeType,
  })
  type: IncomeType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: Currency,
  })
  currency: Currency;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  file_url: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  document_number: string;

  @Column({ type: 'boolean', default: false })
  is_validated: boolean;

  @Column({ type: 'uuid', nullable: true })
  validated_by_id: string;

  @Column({ type: 'timestamp', nullable: true })
  validated_at: Date;

  @Column({ type: 'text', nullable: true })
  observations: string;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    nullable: true,
  })
  payment_method: PaymentMethod;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

