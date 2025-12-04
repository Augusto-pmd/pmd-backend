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
import { SupplierStatus } from '../common/enums/supplier-status.enum';
import { Organization } from '../organizations/organization.entity';
import { SupplierDocument } from '../supplier-documents/supplier-documents.entity';
import { Contract } from '../contracts/contracts.entity';
import { Expense } from '../expenses/expenses.entity';

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
  cuit: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  category: string;

  @Column({
    type: 'enum',
    enum: SupplierStatus,
    default: SupplierStatus.PROVISIONAL,
  })
  status: SupplierStatus;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'uuid', nullable: true })
  created_by_id: string;

  @Column({ type: 'uuid', nullable: true })
  organization_id: string;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => SupplierDocument, (document) => document.supplier)
  documents: SupplierDocument[];

  @OneToMany(() => Contract, (contract) => contract.supplier)
  contracts: Contract[];

  @OneToMany(() => Expense, (expense) => expense.supplier)
  expenses: Expense[];
}

