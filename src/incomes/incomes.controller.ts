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
import { IncomesService } from './incomes.service';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';

@ApiTags('Incomes')
@ApiBearerAuth('JWT-auth')
@Controller('incomes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IncomesController {
  constructor(private readonly incomesService: IncomesService) {}

  @Post()
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Create income',
    description: 'Create a new income record. Only Administration and Direction can create incomes. If validated, work totals will be automatically updated.',
  })
  @ApiBody({ type: CreateIncomeDto })
  @ApiResponse({ status: 201, description: 'Income created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or work not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  create(@Body() createIncomeDto: CreateIncomeDto, @Request() req) {
    return this.incomesService.create(createIncomeDto, req.user);
  }

  @Get()
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Get all incomes',
    description: 'Retrieve all incomes filtered by organization through associated works. Supervisors, Administration, and Direction can view incomes.',
  })
  @ApiResponse({ status: 200, description: 'List of incomes' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  findAll(@Request() req) {
    return this.incomesService.findAll(req.user);
  }

  @Get(':id')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Get income by ID',
    description: 'Retrieve a specific income by its ID. Income must belong to a work in the user\'s organization.',
  })
  @ApiParam({ name: 'id', description: 'Income UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Income details' })
  @ApiResponse({ status: 403, description: 'Income does not belong to your organization' })
  @ApiResponse({ status: 404, description: 'Income not found' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.incomesService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Update income',
    description: 'Update an income. Only Administration and Direction can update incomes. Work totals will be recalculated if validation status changes.',
  })
  @ApiParam({ name: 'id', description: 'Income UUID', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateIncomeDto })
  @ApiResponse({ status: 200, description: 'Income updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error (amount cannot be negative)' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions or income does not belong to your organization' })
  @ApiResponse({ status: 404, description: 'Income not found' })
  update(@Param('id') id: string, @Body() updateIncomeDto: UpdateIncomeDto, @Request() req) {
    return this.incomesService.update(id, updateIncomeDto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Delete income',
    description: 'Delete an income. Only Direction can delete incomes. This action cannot be undone.',
  })
  @ApiParam({ name: 'id', description: 'Income UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Income deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only Direction can delete incomes' })
  @ApiResponse({ status: 404, description: 'Income not found' })
  remove(@Param('id') id: string, @Request() req) {
    return this.incomesService.remove(id, req.user);
  }
}


