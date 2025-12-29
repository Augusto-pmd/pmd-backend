import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
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
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { OfflineService } from './offline.service';
import { CreateOfflineItemDto } from './dto/create-offline-item.dto';
import { ExpensesService } from '../expenses/expenses.service';
import { IncomesService } from '../incomes/incomes.service';
import { WorksService } from '../works/works.service';
import { ContractsService } from '../contracts/contracts.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { CashMovementsService } from '../cash-movements/cash-movements.service';
import { CreateExpenseDto } from '../expenses/dto/create-expense.dto';
import { CreateIncomeDto } from '../incomes/dto/create-income.dto';
import { CreateWorkDto } from '../works/dto/create-work.dto';
import { CreateContractDto } from '../contracts/dto/create-contract.dto';
import { CreateSupplierDto } from '../suppliers/dto/create-supplier.dto';
import { CreateCashMovementDto } from '../cash-movements/dto/create-cash-movement.dto';
import { User } from '../users/user.entity';
import { Logger } from '@nestjs/common';

@ApiTags('Offline')
@ApiBearerAuth('JWT-auth')
@Controller('offline')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OfflineController {
  private readonly logger = new Logger(OfflineController.name);

  constructor(
    private readonly offlineService: OfflineService,
    private readonly expensesService: ExpensesService,
    private readonly incomesService: IncomesService,
    private readonly worksService: WorksService,
    private readonly contractsService: ContractsService,
    private readonly suppliersService: SuppliersService,
    private readonly cashMovementsService: CashMovementsService,
  ) {}

  @Post()
  @Roles(
    UserRole.OPERATOR,
    UserRole.SUPERVISOR,
    UserRole.ADMINISTRATION,
    UserRole.DIRECTION,
  )
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Save offline item',
    description: 'Save an item that was created while offline',
  })
  @ApiBody({ type: CreateOfflineItemDto })
  @ApiResponse({ status: 201, description: 'Offline item saved successfully' })
  async saveOfflineItem(
    @Body() createOfflineItemDto: CreateOfflineItemDto,
    @Request() req,
  ) {
    return await this.offlineService.saveOfflineItem(
      createOfflineItemDto.item_type,
      createOfflineItemDto.data,
      req.user,
    );
  }

  @Get('pending')
  @Roles(
    UserRole.OPERATOR,
    UserRole.SUPERVISOR,
    UserRole.ADMINISTRATION,
    UserRole.DIRECTION,
  )
  @ApiOperation({
    summary: 'Get pending items',
    description: 'Get all pending offline items for the current user',
  })
  @ApiResponse({ status: 200, description: 'List of pending offline items' })
  async getPendingItems(@Request() req) {
    return await this.offlineService.getPendingItems(req.user);
  }

  @Get()
  @Roles(
    UserRole.OPERATOR,
    UserRole.SUPERVISOR,
    UserRole.ADMINISTRATION,
    UserRole.DIRECTION,
  )
  @ApiOperation({
    summary: 'Get all offline items',
    description: 'Get all offline items (pending and synced) for the current user',
  })
  @ApiResponse({ status: 200, description: 'List of all offline items' })
  async getAllItems(@Request() req) {
    return await this.offlineService.getAllItems(req.user);
  }

  @Post('sync')
  @Roles(
    UserRole.OPERATOR,
    UserRole.SUPERVISOR,
    UserRole.ADMINISTRATION,
    UserRole.DIRECTION,
  )
  @ApiOperation({
    summary: 'Sync offline items',
    description:
      'Sync all pending offline items. The sync logic is handled by the respective services (ExpensesService, IncomesService, etc.).',
  })
  @ApiResponse({
    status: 200,
    description: 'Sync completed with results',
  })
  async syncOfflineItems(@Request() req) {
    const user: User = req.user;

    // Create sync handlers map
    const syncHandlers = new Map<
      string,
      (data: Record<string, any>, user: User) => Promise<any>
    >();

    // Expense handler
    syncHandlers.set('expense', async (data: Record<string, any>, user: User) => {
      const payload = data.payload || data;
      const createExpenseDto = payload as CreateExpenseDto;
      return await this.expensesService.create(createExpenseDto, user);
    });

    // Income handler
    syncHandlers.set('income', async (data: Record<string, any>, user: User) => {
      const payload = data.payload || data;
      const createIncomeDto = payload as CreateIncomeDto;
      return await this.incomesService.create(createIncomeDto, user);
    });

    // Work handler
    syncHandlers.set('work', async (data: Record<string, any>, user: User) => {
      const payload = data.payload || data;
      const createWorkDto = payload as CreateWorkDto;
      return await this.worksService.create(createWorkDto, user);
    });

    // Contract handler
    syncHandlers.set('contract', async (data: Record<string, any>, user: User) => {
      const payload = data.payload || data;
      const createContractDto = payload as CreateContractDto;
      return await this.contractsService.create(createContractDto, user);
    });

    // Supplier handler
    syncHandlers.set('supplier', async (data: Record<string, any>, user: User) => {
      const payload = data.payload || data;
      const createSupplierDto = payload as CreateSupplierDto;
      return await this.suppliersService.create(createSupplierDto, user);
    });

    // Cash movement handler
    syncHandlers.set('cash_movement', async (data: Record<string, any>, user: User) => {
      const payload = data.payload || data;
      const createCashMovementDto = payload as CreateCashMovementDto;
      return await this.cashMovementsService.create(createCashMovementDto, user);
    });

    // Execute sync
    const result = await this.offlineService.syncOfflineItems(user, syncHandlers);

    this.logger.log(
      `Sync completed for user ${user.id}: ${result.synced} synced, ${result.failed} failed`,
    );

    return result;
  }

  @Delete('synced/:id')
  @Roles(
    UserRole.OPERATOR,
    UserRole.SUPERVISOR,
    UserRole.ADMINISTRATION,
    UserRole.DIRECTION,
  )
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete synced item',
    description: 'Delete a synced offline item',
  })
  @ApiParam({ name: 'id', description: 'Offline item UUID', type: String })
  @ApiResponse({ status: 204, description: 'Item deleted successfully' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async deleteSyncedItem(@Param('id') id: string, @Request() req) {
    await this.offlineService.deleteSyncedItem(id, req.user);
  }

  @Delete('synced')
  @Roles(
    UserRole.OPERATOR,
    UserRole.SUPERVISOR,
    UserRole.ADMINISTRATION,
    UserRole.DIRECTION,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clear all synced items',
    description: 'Delete all synced offline items for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Number of items deleted',
  })
  async clearSyncedItems(@Request() req) {
    const count = await this.offlineService.clearSyncedItems(req.user);
    return { deleted: count };
  }
}

