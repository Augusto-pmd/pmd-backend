import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashboxesService } from './cashboxes.service';
import { CashboxesController } from './cashboxes.controller';
import { Cashbox } from './cashboxes.entity';
import { User } from '../users/user.entity';
import { CashMovement } from '../cash-movements/cash-movements.entity';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [TypeOrmModule.forFeature([Cashbox, User, CashMovement]), AlertsModule],
  controllers: [CashboxesController],
  providers: [CashboxesService],
  exports: [CashboxesService],
})
export class CashboxesModule {}

