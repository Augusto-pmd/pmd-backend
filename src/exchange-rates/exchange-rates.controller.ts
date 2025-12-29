import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { ExchangeRatesService } from './exchange-rates.service';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { UpdateExchangeRateDto } from './dto/update-exchange-rate.dto';

@ApiTags('Exchange Rates')
@ApiBearerAuth('JWT-auth')
@Controller('exchange-rates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExchangeRatesController {
  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  @Post()
  @Roles(UserRole.ADMINISTRATION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create exchange rate',
    description: 'Create a new exchange rate. Only Administration can create exchange rates.',
  })
  @ApiBody({ type: CreateExchangeRateDto })
  @ApiResponse({ status: 201, description: 'Exchange rate created successfully' })
  @ApiResponse({ status: 403, description: 'Only Administration can create exchange rates' })
  @ApiResponse({ status: 409, description: 'Exchange rate already exists for this date' })
  create(@Body() createExchangeRateDto: CreateExchangeRateDto, @Request() req) {
    return this.exchangeRatesService.create(createExchangeRateDto, req.user);
  }

  @Get('current')
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Get current exchange rate',
    description: 'Get the most recent exchange rate (current rate).',
  })
  @ApiResponse({ status: 200, description: 'Current exchange rate' })
  @ApiResponse({ status: 404, description: 'No exchange rate found' })
  getCurrent() {
    return this.exchangeRatesService.getCurrentRate();
  }

  @Get()
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Get exchange rates',
    description: 'Get all exchange rates or filter by date.',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Filter by specific date (YYYY-MM-DD)',
    type: String,
    example: '2024-01-15',
  })
  @ApiResponse({ status: 200, description: 'List of exchange rates' })
  findAll(@Query('date') date?: string) {
    if (date) {
      return this.exchangeRatesService.getRateByDate(date);
    }
    return this.exchangeRatesService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Get exchange rate by ID' })
  @ApiParam({ name: 'id', description: 'Exchange rate UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Exchange rate details' })
  @ApiResponse({ status: 404, description: 'Exchange rate not found' })
  findOne(@Param('id') id: string) {
    return this.exchangeRatesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRATION)
  @ApiOperation({
    summary: 'Update exchange rate',
    description: 'Update an exchange rate. Only Administration can update exchange rates.',
  })
  @ApiParam({ name: 'id', description: 'Exchange rate UUID', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateExchangeRateDto })
  @ApiResponse({ status: 200, description: 'Exchange rate updated successfully' })
  @ApiResponse({ status: 403, description: 'Only Administration can update exchange rates' })
  @ApiResponse({ status: 404, description: 'Exchange rate not found' })
  @ApiResponse({ status: 409, description: 'Exchange rate already exists for this date' })
  update(
    @Param('id') id: string,
    @Body() updateExchangeRateDto: UpdateExchangeRateDto,
    @Request() req,
  ) {
    return this.exchangeRatesService.update(id, updateExchangeRateDto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRATION)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete exchange rate',
    description: 'Delete an exchange rate. Only Administration can delete exchange rates.',
  })
  @ApiParam({ name: 'id', description: 'Exchange rate UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Exchange rate deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only Administration can delete exchange rates' })
  @ApiResponse({ status: 404, description: 'Exchange rate not found' })
  remove(@Param('id') id: string, @Request() req) {
    return this.exchangeRatesService.remove(id, req.user);
  }
}

