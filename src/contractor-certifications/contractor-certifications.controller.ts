import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { ContractorCertificationsService } from './contractor-certifications.service';
import { CreateContractorCertificationDto } from './dto/create-contractor-certification.dto';
import { UpdateContractorCertificationDto } from './dto/update-contractor-certification.dto';

@ApiTags('Contractor Certifications')
@ApiBearerAuth('JWT-auth')
@Controller('contractor-certifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContractorCertificationsController {
  constructor(
    private readonly contractorCertificationsService: ContractorCertificationsService,
  ) {}

  @Post()
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Crear certificación semanal de contratista',
    description:
      'Crea una certificación semanal para un supplier tipo CONTRACTOR y genera un gasto automáticamente (si es posible).',
  })
  @ApiBody({ type: CreateContractorCertificationDto })
  @ApiResponse({ status: 201, description: 'Certificación creada' })
  create(@Body() dto: CreateContractorCertificationDto, @Request() req) {
    return this.contractorCertificationsService.create(dto, req.user);
  }

  @Get()
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Listar certificaciones',
    description:
      'Por defecto muestra todas. Usar filterByOrganization=true para filtrar por organización del usuario.',
  })
  @ApiQuery({
    name: 'filterByOrganization',
    required: false,
    type: Boolean,
    description: 'If true, filter by user organization. Default false = show all.',
  })
  @ApiQuery({
    name: 'supplier_id',
    required: false,
    type: String,
    description: 'Filter by supplier UUID',
  })
  @ApiQuery({
    name: 'week_start_date',
    required: false,
    type: String,
    description: 'Filter by week start date (any date within the week; normalized to Monday)',
  })
  @ApiResponse({ status: 200, description: 'Lista de certificaciones' })
  findAll(
    @Request() req,
    @Query('filterByOrganization') filterByOrganization?: string,
    @Query('supplier_id') supplier_id?: string,
    @Query('week_start_date') week_start_date?: string,
  ) {
    const filterByOrg = filterByOrganization === 'true' || filterByOrganization === '1';
    return this.contractorCertificationsService.findAll(req.user, {
      filterByOrganization: filterByOrg,
      supplier_id: supplier_id || undefined,
      week_start_date: week_start_date || undefined,
    });
  }

  @Get('supplier/:supplier_id')
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Certificaciones por supplier contratista' })
  @ApiParam({ name: 'supplier_id', description: 'Supplier UUID', type: String, format: 'uuid' })
  @ApiQuery({
    name: 'filterByOrganization',
    required: false,
    type: Boolean,
    description: 'If true, filter by user organization. Default false = show all.',
  })
  findBySupplier(
    @Param('supplier_id') supplierId: string,
    @Request() req,
    @Query('filterByOrganization') filterByOrganization?: string,
  ) {
    const filterByOrg = filterByOrganization === 'true' || filterByOrganization === '1';
    return this.contractorCertificationsService.findBySupplier(supplierId, req.user, filterByOrg);
  }

  @Get('week/:week_start_date')
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Certificaciones por semana (week_start_date)' })
  @ApiParam({
    name: 'week_start_date',
    description: 'Week start date (Monday) or any date within the week',
    example: '2026-01-19',
  })
  @ApiQuery({
    name: 'filterByOrganization',
    required: false,
    type: Boolean,
    description: 'If true, filter by user organization. Default false = show all.',
  })
  findByWeek(
    @Param('week_start_date') weekStartDate: string,
    @Request() req,
    @Query('filterByOrganization') filterByOrganization?: string,
  ) {
    const filterByOrg = filterByOrganization === 'true' || filterByOrganization === '1';
    return this.contractorCertificationsService.findByWeek(weekStartDate, req.user, filterByOrg);
  }

  @Get(':id')
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Obtener certificación por ID' })
  @ApiParam({ name: 'id', description: 'ContractorCertification UUID', type: String, format: 'uuid' })
  findOne(@Param('id') id: string) {
    return this.contractorCertificationsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Actualizar certificación' })
  @ApiParam({ name: 'id', description: 'ContractorCertification UUID', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateContractorCertificationDto })
  update(@Param('id') id: string, @Body() dto: UpdateContractorCertificationDto, @Request() req) {
    return this.contractorCertificationsService.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Eliminar certificación',
    description:
      'Elimina la certificación. Si tiene gasto asociado, intenta anularlo automáticamente.',
  })
  @ApiParam({ name: 'id', description: 'ContractorCertification UUID', type: String, format: 'uuid' })
  remove(@Param('id') id: string, @Request() req) {
    return this.contractorCertificationsService.remove(id, req.user);
  }
}

