import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingService } from './accounting.service';
import { AccountingController } from './accounting.controller';
import { AccountingRecord } from './accounting.entity';
import { Organization } from '../organizations/organization.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AccountingRecord, Organization])],
  controllers: [AccountingController],
  providers: [AccountingService],
  exports: [AccountingService],
})
export class AccountingModule {}

