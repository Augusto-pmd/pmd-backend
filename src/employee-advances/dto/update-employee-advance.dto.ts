import { PartialType } from '@nestjs/swagger';
import { CreateEmployeeAdvanceDto } from './create-employee-advance.dto';

export class UpdateEmployeeAdvanceDto extends PartialType(CreateEmployeeAdvanceDto) {}

