import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkBudgetDto } from './create-work-budget.dto';

export class UpdateWorkBudgetDto extends PartialType(CreateWorkBudgetDto) {}

