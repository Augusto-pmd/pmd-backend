import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkDocumentsService } from './work-documents.service';
import { WorkDocumentsController } from './work-documents.controller';
import { WorkDocument } from './work-documents.entity';
import { Work } from '../works/works.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WorkDocument, Work])],
  controllers: [WorkDocumentsController],
  providers: [WorkDocumentsService],
  exports: [WorkDocumentsService],
})
export class WorkDocumentsModule {}

