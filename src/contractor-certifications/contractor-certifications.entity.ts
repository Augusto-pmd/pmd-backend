import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Supplier } from '../suppliers/suppliers.entity';
import { Expense } from '../expenses/expenses.entity';
import { Organization } from '../organizations/organization.entity';
import { Contract } from '../contracts/contracts.entity';

@Entity('contractor_certifications')
export class ContractorCertification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'supplier_id' })
  supplier_id: string;

  @ManyToOne(() => Supplier, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ type: 'date', name: 'week_start_date' })
  week_start_date: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Optional: store which contract/work this certification belongs to
  @Column({ type: 'uuid', nullable: true, name: 'contract_id' })
  contract_id: string | null;

  @ManyToOne(() => Contract, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contract_id' })
  contract: Contract | null;

  @Column({ type: 'uuid', nullable: true, name: 'expense_id' })
  expense_id: string | null;

  @ManyToOne(() => Expense, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'expense_id' })
  expense: Expense | null;

  @Column({ type: 'uuid', nullable: true, name: 'organization_id' })
  organization_id: string | null;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}

