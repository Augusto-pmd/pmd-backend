import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeAdvance } from './employee-advances.entity';
import { EmployeeAdvancesService } from './employee-advances.service';
import { EmployeeAdvancesController } from './employee-advances.controller';
import { Employee } from '../employees/employees.entity';
import { Organization } from '../organizations/organization.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EmployeeAdvance, Employee, Organization])],
  controllers: [EmployeeAdvancesController],
  providers: [EmployeeAdvancesService],
  exports: [EmployeeAdvancesService],
})
export class EmployeeAdvancesModule {}

