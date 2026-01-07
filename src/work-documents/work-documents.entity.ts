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
import { User } from '../users/user.entity';

export enum WorkDocumentType {
  CONTRACT = 'contract',
  PLAN = 'plan',
  PERMIT = 'permit',
  INVOICE = 'invoice',
  RECEIPT = 'receipt',
  OTHER = 'other',
}

export enum WorkDocumentStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('work_documents')
export class WorkDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  work_id: string;

  @ManyToOne(() => Work, (work) => work.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_id' })
  work: Work;

  @Column({ type: 'varchar', length: 500 })
  file_url: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({
    type: 'enum',
    enum: WorkDocumentType,
  })
  type: WorkDocumentType;

  @Column({
    type: 'enum',
    enum: WorkDocumentStatus,
    default: WorkDocumentStatus.DRAFT,
  })
  status: WorkDocumentStatus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  version: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'uuid', nullable: true })
  created_by_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  created_by: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

