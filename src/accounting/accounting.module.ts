import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingService } from './accounting.service';
import { AccountingController } from './accounting.controller';
import { AccountingRecord } from './accounting.entity';
import { Organization } from '../organizations/organization.entity';
import { Expense } from '../expenses/expenses.entity';
import { Cashbox } from '../cashboxes/cashboxes.entity';
import { Contract } from '../contracts/contracts.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountingRecord,
      Organization,
      Expense,
      Cashbox,
      Contract,
    ]),
  ],
  controllers: [AccountingController],
  providers: [AccountingService],
  exports: [AccountingService],
})
export class AccountingModule {}

