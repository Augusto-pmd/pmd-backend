import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { WorkBudgetsService } from './work-budgets.service';
import { CreateWorkBudgetDto } from './dto/create-work-budget.dto';
import { UpdateWorkBudgetDto } from './dto/update-work-budget.dto';

@Controller('work-budgets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkBudgetsController {
  constructor(private readonly workBudgetsService: WorkBudgetsService) {}

  @Post()
  @Roles(UserRole.DIRECTION, UserRole.ADMINISTRATION)
  create(@Body() createWorkBudgetDto: CreateWorkBudgetDto) {
    return this.workBudgetsService.create(createWorkBudgetDto);
  }

  @Get()
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  findAll() {
    return this.workBudgetsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  findOne(@Param('id') id: string) {
    return this.workBudgetsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.DIRECTION, UserRole.ADMINISTRATION)
  update(@Param('id') id: string, @Body() updateWorkBudgetDto: UpdateWorkBudgetDto) {
    return this.workBudgetsService.update(id, updateWorkBudgetDto);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTION)
  remove(@Param('id') id: string) {
    return this.workBudgetsService.remove(id);
  }
}


