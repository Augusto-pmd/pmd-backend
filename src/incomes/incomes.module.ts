import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IncomesService } from './incomes.service';
import { IncomesController } from './incomes.controller';
import { Income } from './incomes.entity';
import { Work } from '../works/works.entity';
import { AccountingRecord } from '../accounting/accounting.entity';
import { WorksModule } from '../works/works.module';

@Module({
  imports: [TypeOrmModule.forFeature([Income, Work, AccountingRecord]), WorksModule],
  controllers: [IncomesController],
  providers: [IncomesService],
  exports: [IncomesService],
})
export class IncomesModule {}


