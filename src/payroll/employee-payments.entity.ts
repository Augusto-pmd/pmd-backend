import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Employee } from '../employees/employees.entity';
import { Organization } from '../organizations/organization.entity';
import { Expense } from '../expenses/expenses.entity';

@Entity('employee_payments')
export class EmployeePayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'employee_id' })
  employee_id: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ type: 'date', name: 'week_start_date' })
  week_start_date: Date;

  @Column({ type: 'int', name: 'days_worked' })
  days_worked: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'total_salary' })
  total_salary: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'late_hours' })
  late_hours: number | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'late_deduction' })
  late_deduction: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'total_advances' })
  total_advances: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'net_payment' })
  net_payment: number;

  @Column({ type: 'timestamp', nullable: true, name: 'paid_at' })
  paid_at: Date | null;

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

