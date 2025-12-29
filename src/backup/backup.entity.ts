import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum BackupType {
  FULL = 'full',
  INCREMENTAL = 'incremental',
}

export enum BackupStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('backups')
export class Backup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: BackupType,
  })
  type: BackupType;

  @Column({
    type: 'enum',
    enum: BackupStatus,
    default: BackupStatus.PENDING,
  })
  status: BackupStatus;

  @Column({ type: 'varchar', length: 500 })
  file_path: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  storage_url: string | null;

  @Column({ type: 'bigint' })
  file_size: number; // Size in bytes

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @Column({ type: 'uuid', nullable: true })
  created_by_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  created_by: User | null;

  @Column({ type: 'timestamp', nullable: true })
  started_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date | null;

  @CreateDateColumn()
  created_at: Date;
}

