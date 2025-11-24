import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RubricsService } from './rubrics.service';
import { RubricsController } from './rubrics.controller';
import { Rubric } from './rubrics.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Rubric])],
  controllers: [RubricsController],
  providers: [RubricsService],
  exports: [RubricsService],
})
export class RubricsModule {}


