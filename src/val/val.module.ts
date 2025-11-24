import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ValService } from './val.service';
import { ValController } from './val.controller';
import { Val } from './val.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Val])],
  controllers: [ValController],
  providers: [ValService],
  exports: [ValService],
})
export class ValModule {}

