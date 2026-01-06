import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ValidateExpenseDto } from './dto/validate-expense.dto';
import { RejectExpenseDto } from './dto/reject-expense.dto';

@ApiTags('Expenses')
@ApiBearerAuth('JWT-auth')
@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @Roles(UserRole.OPERATOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Create expense',
    description: 'Create a new expense. Work is mandatory. VAL will be auto-generated if no document number is provided.',
  })
  @ApiBody({ type: CreateExpenseDto })
  @ApiResponse({ status: 201, description: 'Expense created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or work not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  create(@Body() createExpenseDto: CreateExpenseDto, @Request() req) {
    return this.expensesService.create(createExpenseDto, req.user);
  }

  @Get()
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Get all expenses',
    description: 'Retrieve all expenses. Operators can only see their own expenses.',
  })
  @ApiResponse({ status: 200, description: 'List of expenses' })
  findAll(@Request() req) {
    return this.expensesService.findAll(req.user);
  }

  @Get(':id')
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Get expense by ID' })
  @ApiParam({ name: 'id', description: 'Expense UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Expense details' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.expensesService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Update expense',
    description: 'Update expense. Only Administration and Direction can update expenses. Operators cannot update expenses.',
  })
  @ApiParam({ name: 'id', description: 'Expense UUID', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateExpenseDto })
  @ApiResponse({ status: 200, description: 'Expense updated successfully' })
  @ApiResponse({ status: 403, description: 'Cannot edit validated expense' })
  update(@Param('id') id: string, @Body() updateExpenseDto: UpdateExpenseDto, @Request() req) {
    return this.expensesService.update(id, updateExpenseDto, req.user);
  }

  @Post(':id/validate')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Validate expense',
    description: 'Validate or observe an expense. Only Administration and Direction can validate.',
  })
  @ApiParam({ name: 'id', description: 'Expense UUID', type: String, format: 'uuid' })
  @ApiBody({ type: ValidateExpenseDto })
  @ApiResponse({ status: 200, description: 'Expense validated successfully' })
  @ApiResponse({ status: 403, description: 'Only Administration and Direction can validate' })
  validate(@Param('id') id: string, @Body() validateDto: ValidateExpenseDto, @Request() req) {
    return this.expensesService.validate(id, validateDto, req.user);
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Reject expense',
    description: 'Reject an expense. Only Administration and Direction can reject. Observations are mandatory.',
  })
  @ApiParam({ name: 'id', description: 'Expense UUID', type: String, format: 'uuid' })
  @ApiBody({ type: RejectExpenseDto })
  @ApiResponse({ status: 200, description: 'Expense rejected successfully' })
  @ApiResponse({ status: 400, description: 'Observations are mandatory or expense cannot be rejected' })
  @ApiResponse({ status: 403, description: 'Only Administration and Direction can reject expenses' })
  reject(@Param('id') id: string, @Body() rejectDto: RejectExpenseDto, @Request() req) {
    return this.expensesService.reject(id, rejectDto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Delete expense',
    description: 'Delete an expense. Only Direction can delete expenses.',
  })
  @ApiParam({ name: 'id', description: 'Expense UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Expense deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only Direction can delete expenses' })
  remove(@Param('id') id: string, @Request() req) {
    return this.expensesService.remove(id, req.user);
  }
}

