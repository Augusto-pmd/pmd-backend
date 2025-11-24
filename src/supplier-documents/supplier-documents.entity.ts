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
import { SupplierDocumentType } from '../common/enums/supplier-document-type.enum';

@Entity('supplier_documents')
export class SupplierDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  supplier_id: string;

  @ManyToOne(() => Supplier, (supplier) => supplier.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({
    type: 'enum',
    enum: SupplierDocumentType,
  })
  document_type: SupplierDocumentType;

  @Column({ type: 'varchar', length: 500, nullable: true })
  file_url: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  document_number: string;

  @Column({ type: 'date', nullable: true })
  expiration_date: Date;

  @Column({ type: 'boolean', default: true })
  is_valid: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

