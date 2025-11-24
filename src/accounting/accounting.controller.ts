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
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AccountingService } from './accounting.service';
import { CreateAccountingRecordDto } from './dto/create-accounting-record.dto';
import { UpdateAccountingRecordDto } from './dto/update-accounting-record.dto';
import { CloseMonthDto } from './dto/close-month.dto';

@ApiTags('Accounting')
@ApiBearerAuth('JWT-auth')
@Controller('accounting')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Post()
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Create accounting record',
    description: 'Create a new accounting record. Cannot create records for closed months unless Direction.',
  })
  @ApiBody({ type: CreateAccountingRecordDto })
  @ApiResponse({ status: 201, description: 'Accounting record created successfully' })
  @ApiResponse({ status: 403, description: 'Cannot create records for closed month' })
  create(@Body() createDto: CreateAccountingRecordDto, @Request() req) {
    return this.accountingService.create(createDto, req.user);
  }

  @Get()
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Get all accounting records' })
  @ApiResponse({ status: 200, description: 'List of accounting records' })
  findAll(@Request() req) {
    return this.accountingService.findAll(req.user);
  }

  @Get('month/:month/:year')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Get accounting records by month and year' })
  @ApiParam({ name: 'month', description: 'Month (1-12)', type: Number })
  @ApiParam({ name: 'year', description: 'Year (>= 2000)', type: Number })
  @ApiResponse({ status: 200, description: 'List of accounting records for the month' })
  findByMonth(@Param('month') month: number, @Param('year') year: number, @Request() req) {
    return this.accountingService.findByMonth(month, year, req.user);
  }

  @Get('purchases-book')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Get IVA Purchases Book report' })
  @ApiQuery({ name: 'month', description: 'Month (1-12)', type: Number })
  @ApiQuery({ name: 'year', description: 'Year', type: Number })
  @ApiResponse({ status: 200, description: 'Purchases book report' })
  getPurchasesBook(@Query('month') month: number, @Query('year') year: number, @Request() req) {
    return this.accountingService.getPurchasesBook(month, year, req.user);
  }

  @Get('perceptions')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Get perceptions report' })
  @ApiQuery({ name: 'month', description: 'Month (1-12)', type: Number })
  @ApiQuery({ name: 'year', description: 'Year', type: Number })
  @ApiResponse({ status: 200, description: 'Perceptions report' })
  getPerceptionsReport(@Query('month') month: number, @Query('year') year: number, @Request() req) {
    return this.accountingService.getPerceptionsReport(month, year, req.user);
  }

  @Get('withholdings')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Get withholdings report' })
  @ApiQuery({ name: 'month', description: 'Month (1-12)', type: Number })
  @ApiQuery({ name: 'year', description: 'Year', type: Number })
  @ApiResponse({ status: 200, description: 'Withholdings report' })
  getWithholdingsReport(@Query('month') month: number, @Query('year') year: number, @Request() req) {
    return this.accountingService.getWithholdingsReport(month, year, req.user);
  }

  @Get(':id')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Get accounting record by ID' })
  @ApiParam({ name: 'id', description: 'Accounting record UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Accounting record details' })
  @ApiResponse({ status: 404, description: 'Accounting record not found' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.accountingService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Update accounting record',
    description: 'Update accounting record. Cannot update records in closed months unless Direction.',
  })
  @ApiParam({ name: 'id', description: 'Accounting record UUID', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateAccountingRecordDto })
  @ApiResponse({ status: 200, description: 'Accounting record updated successfully' })
  @ApiResponse({ status: 403, description: 'Cannot update records in closed month' })
  update(@Param('id') id: string, @Body() updateDto: UpdateAccountingRecordDto, @Request() req) {
    return this.accountingService.update(id, updateDto, req.user);
  }

  @Post('close-month')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Close accounting month',
    description: 'Close an accounting month, locking all records. Only Administration and Direction can close months.',
  })
  @ApiBody({ type: CloseMonthDto })
  @ApiResponse({ status: 200, description: 'Month closed successfully' })
  @ApiResponse({ status: 400, description: 'No records found for this month' })
  closeMonth(@Body() closeMonthDto: CloseMonthDto, @Request() req) {
    return this.accountingService.closeMonth(closeMonthDto, req.user);
  }

  @Post('reopen-month/:month/:year')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Reopen closed month',
    description: 'Reopen a closed accounting month. Only Direction can reopen closed months.',
  })
  @ApiParam({ name: 'month', description: 'Month (1-12)', type: Number })
  @ApiParam({ name: 'year', description: 'Year', type: Number })
  @ApiResponse({ status: 200, description: 'Month reopened successfully' })
  @ApiResponse({ status: 403, description: 'Only Direction can reopen closed months' })
  reopenMonth(@Param('month') month: number, @Param('year') year: number, @Request() req) {
    return this.accountingService.reopenMonth(month, year, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Delete accounting record',
    description: 'Delete an accounting record. Only Direction can delete records.',
  })
  @ApiParam({ name: 'id', description: 'Accounting record UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Accounting record deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only Direction can delete accounting records' })
  remove(@Param('id') id: string, @Request() req) {
    return this.accountingService.remove(id, req.user);
  }
}

