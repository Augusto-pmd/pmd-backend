import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashboxesService } from './cashboxes.service';
import { CashboxesController } from './cashboxes.controller';
import { Cashbox } from './cashboxes.entity';
import { User } from '../users/users.entity';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [TypeOrmModule.forFeature([Cashbox, User]), AlertsModule],
  controllers: [CashboxesController],
  providers: [CashboxesService],
  exports: [CashboxesService],
})
export class CashboxesModule {}

