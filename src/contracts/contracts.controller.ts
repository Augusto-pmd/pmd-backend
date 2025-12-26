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
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

@ApiTags('Contracts')
@ApiBearerAuth('JWT-auth')
@Controller('contracts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Create contract',
    description: 'Create a new contract. Only Administration and Direction can create contracts. Contract will be automatically blocked when amount_executed >= amount_total.',
  })
  @ApiBody({ type: CreateContractDto })
  @ApiResponse({ status: 201, description: 'Contract created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error (dates, amounts, or supplier blocked)' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Work or supplier not found' })
  create(@Body() createContractDto: CreateContractDto, @Request() req) {
    return this.contractsService.create(createContractDto, req.user);
  }

  @Get()
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Get all contracts',
    description: 'Retrieve all contracts filtered by organization. Supervisors, Administration, and Direction can view contracts.',
  })
  @ApiResponse({ status: 200, description: 'List of contracts' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  findAll(@Request() req) {
    return this.contractsService.findAll(req.user);
  }

  @Get(':id')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Get contract by ID',
    description: 'Retrieve a specific contract by its ID. Contract must belong to the user\'s organization.',
  })
  @ApiParam({ name: 'id', description: 'Contract UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Contract details' })
  @ApiResponse({ status: 403, description: 'Contract does not belong to your organization' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.contractsService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Update contract',
    description: 'Update a contract. Only Administration and Direction can update contracts. Only Direction can modify amount_total, currency, and override blocked status. Contract will be automatically blocked when amount_executed >= amount_total.',
  })
  @ApiParam({ name: 'id', description: 'Contract UUID', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateContractDto })
  @ApiResponse({ status: 200, description: 'Contract updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error (dates, amounts, or contract blocked)' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions or contract does not belong to your organization' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  update(@Param('id') id: string, @Body() updateContractDto: UpdateContractDto, @Request() req) {
    return this.contractsService.update(id, updateContractDto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Delete contract',
    description: 'Delete a contract. Only Direction can delete contracts. This action cannot be undone.',
  })
  @ApiParam({ name: 'id', description: 'Contract UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Contract deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only Direction can delete contracts' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  remove(@Param('id') id: string, @Request() req) {
    return this.contractsService.remove(id, req.user);
  }
}

