import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('offline_items')
export class OfflineItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  item_type: string;

  @Column({ type: 'jsonb' })
  data: Record<string, any>;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'boolean', default: false })
  is_synced: boolean;

  @Column({ type: 'timestamp', nullable: true })
  synced_at: Date | null;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @CreateDateColumn()
  created_at: Date;
}

