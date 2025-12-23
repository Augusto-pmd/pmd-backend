import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashMovementsService } from './cash-movements.service';
import { CashMovementsController } from './cash-movements.controller';
import { CashMovement } from './cash-movements.entity';
import { Cashbox } from '../cashboxes/cashboxes.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CashMovement, Cashbox])],
  controllers: [CashMovementsController],
  providers: [CashMovementsService],
  exports: [CashMovementsService],
})
export class CashMovementsModule {}

