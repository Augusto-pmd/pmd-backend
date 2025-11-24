import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupplierDocumentsService } from './supplier-documents.service';
import { SupplierDocumentsController } from './supplier-documents.controller';
import { SupplierDocument } from './supplier-documents.entity';
import { Supplier } from '../suppliers/suppliers.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SupplierDocument, Supplier])],
  controllers: [SupplierDocumentsController],
  providers: [SupplierDocumentsService],
  exports: [SupplierDocumentsService],
})
export class SupplierDocumentsModule {}


