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
import { Role } from '../roles/roles.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { Cashbox } from '../cashboxes/cashboxes.entity';
import { Expense } from '../expenses/expenses.entity';
import { Work } from '../works/works.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'uuid' })
  role_id: string;

  @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Cashbox, (cashbox) => cashbox.user)
  cashboxes: Cashbox[];

  @OneToMany(() => Expense, (expense) => expense.created_by)
  expenses: Expense[];

  @OneToMany(() => Work, (work) => work.supervisor)
  supervised_works: Work[];
}

