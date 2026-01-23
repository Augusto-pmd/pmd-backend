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
import { Organization } from '../organizations/organization.entity';
import { EmployeeTrade } from '../common/enums/employee-trade.enum';

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, name: 'full_name' })
  fullName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true, name: 'daily_salary' })
  daily_salary: number | null;

  @Column({
    type: 'enum',
    enum: EmployeeTrade,
    nullable: true,
  })
  trade: EmployeeTrade | null;

  @Column({ type: 'uuid', nullable: true, name: 'work_id' })
  work_id: string | null;

  @ManyToOne(() => Work, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'work_id' })
  work: Work | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  area: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  position: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  role: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subrole: string | null;

  @Column({ type: 'date', nullable: true, name: 'hire_date' })
  hireDate: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  seguro: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

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
