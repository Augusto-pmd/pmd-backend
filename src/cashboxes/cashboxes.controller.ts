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
  Query,
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
import { CashboxesService } from './cashboxes.service';
import { CreateCashboxDto } from './dto/create-cashbox.dto';
import { UpdateCashboxDto } from './dto/update-cashbox.dto';
import { CloseCashboxDto } from './dto/close-cashbox.dto';
import { ApproveDifferenceDto } from './dto/approve-difference.dto';
import { RefillCashboxDto } from './dto/refill-cashbox.dto';
import { RequestExplanationDto } from './dto/request-explanation.dto';
import { RejectDifferenceDto } from './dto/reject-difference.dto';
import { ManualAdjustmentDto } from './dto/manual-adjustment.dto';
import { GetHistoryDto } from './dto/get-history.dto';

@ApiTags('Cashboxes')
@ApiBearerAuth('JWT-auth')
@Controller('cashboxes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CashboxesController {
  constructor(private readonly cashboxesService: CashboxesService) {}

  @Post()
  @Roles(UserRole.OPERATOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Create cashbox',
    description: 'Create a new cashbox. Business rule: One open cashbox per user at a time.',
  })
  @ApiBody({ type: CreateCashboxDto })
  @ApiResponse({ status: 201, description: 'Cashbox created successfully' })
  @ApiResponse({ status: 400, description: 'User already has an open cashbox' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  create(@Body() createCashboxDto: CreateCashboxDto, @Request() req) {
    return this.cashboxesService.create(createCashboxDto, req.user);
  }

  @Get()
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Get all cashboxes',
    description: 'Retrieve all cashboxes. Operators can only see their own cashboxes.',
  })
  @ApiResponse({ status: 200, description: 'List of cashboxes' })
  findAll(@Request() req) {
    return this.cashboxesService.findAll(req.user);
  }

  @Get(':id')
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Get cashbox by ID' })
  @ApiParam({ name: 'id', description: 'Cashbox UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Cashbox details' })
  @ApiResponse({ status: 404, description: 'Cashbox not found' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.cashboxesService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.OPERATOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Update cashbox' })
  @ApiParam({ name: 'id', description: 'Cashbox UUID', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateCashboxDto })
  @ApiResponse({ status: 200, description: 'Cashbox updated successfully' })
  update(@Param('id') id: string, @Body() updateCashboxDto: UpdateCashboxDto, @Request() req) {
    return this.cashboxesService.update(id, updateCashboxDto, req.user);
  }

  @Post(':id/close')
  @Roles(UserRole.OPERATOR, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Close cashbox',
    description: 'Close a cashbox and calculate differences. Alerts are generated if differences exist. Operators can only close their own cashboxes.',
  })
  @ApiParam({ name: 'id', description: 'Cashbox UUID', type: String, format: 'uuid' })
  @ApiBody({ type: CloseCashboxDto })
  @ApiResponse({ status: 200, description: 'Cashbox closed successfully' })
  @ApiResponse({ status: 400, description: 'Cashbox is already closed' })
  close(@Param('id') id: string, @Body() closeCashboxDto: CloseCashboxDto, @Request() req) {
    return this.cashboxesService.close(id, closeCashboxDto, req.user);
  }

  @Post(':id/refill')
  @Roles(UserRole.OPERATOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Refill cashbox',
    description: 'Add money to an open cashbox. The opening balance will be automatically updated. Only open cashboxes can receive refills.',
  })
  @ApiParam({ name: 'id', description: 'Cashbox UUID', type: String, format: 'uuid' })
  @ApiBody({ type: RefillCashboxDto })
  @ApiResponse({ status: 201, description: 'Cashbox refilled successfully' })
  @ApiResponse({ status: 400, description: 'Cashbox is closed or validation error' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Cashbox not found' })
  refill(
    @Param('id') id: string,
    @Body() refillDto: RefillCashboxDto,
    @Request() req,
  ) {
    return this.cashboxesService.refill(id, refillDto, req.user);
  }

  @Post(':id/approve-difference')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Approve cashbox difference',
    description: 'Approve cashbox difference. Only Administration and Direction can approve.',
  })
  @ApiParam({ name: 'id', description: 'Cashbox UUID', type: String, format: 'uuid' })
  @ApiBody({ type: ApproveDifferenceDto })
  @ApiResponse({ status: 200, description: 'Difference approved successfully' })
  @ApiResponse({ status: 403, description: 'Only Administration and Direction can approve differences' })
  approveDifference(
    @Param('id') id: string,
    @Body() approveDto: ApproveDifferenceDto,
    @Request() req,
  ) {
    return this.cashboxesService.approveDifference(id, approveDto, req.user);
  }

  @Post(':id/request-explanation')
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Request explanation for cashbox difference',
    description: 'Request an explanation for a cashbox difference. Generates an alert. Available to all roles.',
  })
  @ApiParam({ name: 'id', description: 'Cashbox UUID', type: String, format: 'uuid' })
  @ApiBody({ type: RequestExplanationDto })
  @ApiResponse({ status: 200, description: 'Explanation requested successfully' })
  @ApiResponse({ status: 400, description: 'Cashbox is not closed or has no difference' })
  requestExplanation(
    @Param('id') id: string,
    @Body() requestDto: RequestExplanationDto,
    @Request() req,
  ) {
    return this.cashboxesService.requestExplanation(id, requestDto, req.user);
  }

  @Post(':id/reject-difference')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Reject cashbox difference',
    description: 'Reject a cashbox difference. Only Direction can reject differences. Resets approval status.',
  })
  @ApiParam({ name: 'id', description: 'Cashbox UUID', type: String, format: 'uuid' })
  @ApiBody({ type: RejectDifferenceDto })
  @ApiResponse({ status: 200, description: 'Difference rejected successfully' })
  @ApiResponse({ status: 400, description: 'Cashbox is not closed or has no difference' })
  @ApiResponse({ status: 403, description: 'Only Direction can reject differences' })
  rejectDifference(
    @Param('id') id: string,
    @Body() rejectDto: RejectDifferenceDto,
    @Request() req,
  ) {
    return this.cashboxesService.rejectDifference(id, rejectDto, req.user);
  }

  @Post(':id/manual-adjustment')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Make manual adjustment to cashbox',
    description: 'Make a manual adjustment to a closed cashbox. Only Direction can make adjustments. Creates a movement and recalculates differences.',
  })
  @ApiParam({ name: 'id', description: 'Cashbox UUID', type: String, format: 'uuid' })
  @ApiBody({ type: ManualAdjustmentDto })
  @ApiResponse({ status: 200, description: 'Manual adjustment made successfully' })
  @ApiResponse({ status: 400, description: 'Cashbox is not closed' })
  @ApiResponse({ status: 403, description: 'Only Direction can make manual adjustments' })
  manualAdjustment(
    @Param('id') id: string,
    @Body() adjustmentDto: ManualAdjustmentDto,
    @Request() req,
  ) {
    return this.cashboxesService.manualAdjustment(id, adjustmentDto, req.user);
  }

  @Get(':id/history')
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Get cashbox history',
    description: 'Get detailed history of cashbox movements with filters and pagination. Includes summary of totals by type.',
  })
  @ApiParam({ name: 'id', description: 'Cashbox UUID', type: String, format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Cashbox history with pagination and summary',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        summary: {
          type: 'object',
          properties: {
            totalRefills: { type: 'number' },
            totalExpenses: { type: 'number' },
            totalIncomes: { type: 'number' },
            totalRefillsAmount: { type: 'number' },
            totalExpensesAmount: { type: 'number' },
            totalIncomesAmount: { type: 'number' },
          },
        },
      },
    },
  })
  getHistory(
    @Param('id') id: string,
    @Request() req,
    @Query() filters: GetHistoryDto,
  ) {
    return this.cashboxesService.getHistory(id, filters, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Delete cashbox',
    description: 'Delete a cashbox. Only Direction can delete cashboxes.',
  })
  @ApiParam({ name: 'id', description: 'Cashbox UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Cashbox deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only Direction can delete cashboxes' })
  remove(@Param('id') id: string, @Request() req) {
    return this.cashboxesService.remove(id, req.user);
  }
}

