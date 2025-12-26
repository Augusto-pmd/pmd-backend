import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cashbox } from './cashboxes.entity';
import { CreateCashboxDto } from './dto/create-cashbox.dto';
import { UpdateCashboxDto } from './dto/update-cashbox.dto';
import { CloseCashboxDto } from './dto/close-cashbox.dto';
import { ApproveDifferenceDto } from './dto/approve-difference.dto';
import { RefillCashboxDto } from './dto/refill-cashbox.dto';
import { RequestExplanationDto } from './dto/request-explanation.dto';
import { RejectDifferenceDto } from './dto/reject-difference.dto';
import { ManualAdjustmentDto } from './dto/manual-adjustment.dto';
import { GetHistoryDto } from './dto/get-history.dto';
import { CashboxStatus } from '../common/enums/cashbox-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/user.entity';
import { AlertsService } from '../alerts/alerts.service';
import { AlertType, AlertSeverity } from '../common/enums';
import { CashMovement } from '../cash-movements/cash-movements.entity';
import { CashMovementType } from '../common/enums/cash-movement-type.enum';
import { Currency } from '../common/enums/currency.enum';
import { getOrganizationId } from '../common/helpers/get-organization-id.helper';

@Injectable()
export class CashboxesService {
  private readonly logger = new Logger(CashboxesService.name);

  constructor(
    @InjectRepository(Cashbox)
    private cashboxRepository: Repository<Cashbox>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(CashMovement)
    private cashMovementRepository: Repository<CashMovement>,
    private dataSource: DataSource,
    private alertsService: AlertsService,
  ) {}

  /**
   * Business Rule: One open cashbox per user at a time
   */
  async create(createCashboxDto: CreateCashboxDto, user: User): Promise<Cashbox> {
    // Check if user already has an open cashbox
    const existingOpenCashbox = await this.cashboxRepository.findOne({
      where: {
        user_id: createCashboxDto.user_id || user.id,
        status: CashboxStatus.OPEN,
      },
    });

    if (existingOpenCashbox) {
      throw new BadRequestException(
        'User already has an open cashbox. Please close it before creating a new one.',
      );
    }

    const cashbox = this.cashboxRepository.create({
      ...createCashboxDto,
      user_id: createCashboxDto.user_id || user.id,
      opening_balance_ars: createCashboxDto.opening_balance_ars || 0,
      opening_balance_usd: createCashboxDto.opening_balance_usd || 0,
      status: CashboxStatus.OPEN,
    });

    return await this.cashboxRepository.save(cashbox);
  }

  async findAll(user: User): Promise<Cashbox[]> {
    try {
      const organizationId = getOrganizationId(user);
      const queryBuilder = this.cashboxRepository
        .createQueryBuilder('cashbox')
        .leftJoinAndSelect('cashbox.user', 'user')
        .leftJoinAndSelect('cashbox.movements', 'movements');

      // Operators can only see their own cashboxes
      if (user?.role?.name === UserRole.OPERATOR) {
        queryBuilder.where('cashbox.user_id = :userId', { userId: user.id });
      } else {
        // Direction, Administration, and Supervisor can see all cashboxes
        // Filter by organization_id through user.organizationId
        if (organizationId) {
          queryBuilder.where('user.organizationId = :organizationId', { organizationId });
        }
      }

      return await queryBuilder.orderBy('cashbox.created_at', 'DESC').getMany();
    } catch (error) {
      this.logger.error('Error fetching cashboxes', error);
      return [];
    }
  }

  async findOne(id: string, user: User): Promise<Cashbox> {
    const organizationId = getOrganizationId(user);
    const cashbox = await this.cashboxRepository.findOne({
      where: { id },
      relations: ['user', 'movements'],
    });

    if (!cashbox) {
      throw new NotFoundException(`Cashbox with ID ${id} not found`);
    }

    // Operators can only access their own cashboxes
    if (user.role.name === UserRole.OPERATOR && cashbox.user_id !== user.id) {
      throw new ForbiddenException('You can only access your own cashboxes');
    }

    // Validate ownership through user.organizationId
    if (organizationId && cashbox.user?.organizationId !== organizationId) {
      throw new ForbiddenException('Cashbox does not belong to your organization');
    }

    return cashbox;
  }

  async close(id: string, closeCashboxDto: CloseCashboxDto, user: User): Promise<Cashbox> {
    const cashbox = await this.findOne(id, user);

    if (cashbox.status === CashboxStatus.CLOSED) {
      throw new BadRequestException('Cashbox is already closed');
    }

    // Use transaction to ensure atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get all movements for this cashbox to calculate totals
      const movements = await queryRunner.manager.find(CashMovement, {
        where: { cashbox_id: id },
      });

      // Calculate total ingresos (INCOME) and egresos (EXPENSE) by currency
      let totalIngresosArs = 0;
      let totalIngresosUsd = 0;
      let totalEgresosArs = 0;
      let totalEgresosUsd = 0;

      movements.forEach((movement) => {
        const amount = Number(movement.amount);
        if (movement.type === CashMovementType.INCOME) {
          if (movement.currency === Currency.ARS) {
            totalIngresosArs += amount;
          } else if (movement.currency === Currency.USD) {
            totalIngresosUsd += amount;
          }
        } else if (movement.type === CashMovementType.EXPENSE) {
          if (movement.currency === Currency.ARS) {
            totalEgresosArs += amount;
          } else if (movement.currency === Currency.USD) {
            totalEgresosUsd += amount;
          }
        }
      });

      // Calculate differences according to formula:
      // Diferencia = closing_balance - (opening_balance + ingresos - egresos)
      const openingBalanceArs = Number(cashbox.opening_balance_ars);
      const openingBalanceUsd = Number(cashbox.opening_balance_usd);
      const closingBalanceArs = closeCashboxDto.closing_balance_ars || 0;
      const closingBalanceUsd = closeCashboxDto.closing_balance_usd || 0;

      const differenceArs =
        closingBalanceArs - (openingBalanceArs + totalIngresosArs - totalEgresosArs);
      const differenceUsd =
        closingBalanceUsd - (openingBalanceUsd + totalIngresosUsd - totalEgresosUsd);

      cashbox.closing_balance_ars = closingBalanceArs;
      cashbox.closing_balance_usd = closingBalanceUsd;
      cashbox.difference_ars = differenceArs;
      cashbox.difference_usd = differenceUsd;
      cashbox.closing_date = closeCashboxDto.closing_date
        ? new Date(closeCashboxDto.closing_date)
        : new Date();
      cashbox.status = CashboxStatus.CLOSED;

      const savedCashbox = await queryRunner.manager.save(Cashbox, cashbox);

      // Generate alert if there's a difference (positive or negative)
      if (differenceArs !== 0 || differenceUsd !== 0) {
        await this.alertsService.createAlert({
          type: AlertType.CASHBOX_DIFFERENCE,
          severity:
            Math.abs(differenceArs) > 1000 || Math.abs(differenceUsd) > 100
              ? AlertSeverity.CRITICAL
              : AlertSeverity.WARNING,
          title: `Cashbox difference detected`,
          message: `Cashbox ${cashbox.id} has a difference: ARS ${differenceArs.toFixed(2)}, USD ${differenceUsd.toFixed(2)}`,
          cashbox_id: cashbox.id,
          user_id: user.id,
        });
      }

      await queryRunner.commitTransaction();
      return savedCashbox;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error closing cashbox', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Business Rule: Difference approval - only Administration and Direction can approve
   */
  async approveDifference(
    id: string,
    approveDto: ApproveDifferenceDto,
    user: User,
  ): Promise<Cashbox> {
    // Check permissions
    if (
      user.role.name !== UserRole.ADMINISTRATION &&
      user.role.name !== UserRole.DIRECTION
    ) {
      throw new ForbiddenException(
        'Only Administration and Direction can approve cashbox differences',
      );
    }

    const cashbox = await this.findOne(id, user);

    if (cashbox.difference_approved) {
      throw new BadRequestException('Difference is already approved');
    }

    cashbox.difference_approved = true;
    cashbox.difference_approved_by_id = user.id;
    cashbox.difference_approved_at = new Date();

    return await this.cashboxRepository.save(cashbox);
  }

  async update(id: string, updateCashboxDto: UpdateCashboxDto, user: User): Promise<Cashbox> {
    const cashbox = await this.findOne(id, user);

    // Prevent updating closed cashboxes unless Direction
    if (
      cashbox.status === CashboxStatus.CLOSED &&
      user.role.name !== UserRole.DIRECTION
    ) {
      throw new ForbiddenException('Cannot update closed cashbox');
    }

    // Validate amounts are not negative
    if (updateCashboxDto.opening_balance_ars !== undefined && updateCashboxDto.opening_balance_ars < 0) {
      throw new BadRequestException('opening_balance_ars cannot be negative');
    }
    if (updateCashboxDto.opening_balance_usd !== undefined && updateCashboxDto.opening_balance_usd < 0) {
      throw new BadRequestException('opening_balance_usd cannot be negative');
    }

    Object.assign(cashbox, updateCashboxDto);
    return await this.cashboxRepository.save(cashbox);
  }

  /**
   * Business Rule: Refill cashbox - Add money to an open cashbox
   * Business Rule: Only open cashboxes can receive refills
   * Business Rule: Automatically update opening_balance based on currency
   */
  async refill(id: string, refillDto: RefillCashboxDto, user: User): Promise<CashMovement> {
    // Validate cashbox exists and belongs to user's organization
    const cashbox = await this.findOne(id, user);

    // Validate cashbox is open
    if (cashbox.status !== CashboxStatus.OPEN) {
      throw new BadRequestException('Cannot refill a closed cashbox. Please open the cashbox first.');
    }

    // Use transaction to ensure atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create description with delivered_by if provided
      const description = refillDto.description || 
        (refillDto.delivered_by 
          ? `Refuerzo entregado por ${refillDto.delivered_by}` 
          : 'Refuerzo de caja');

      // Create cash movement of type REFILL
      const movement = queryRunner.manager.create(CashMovement, {
        cashbox_id: id,
        type: CashMovementType.REFILL,
        amount: refillDto.amount,
        currency: refillDto.currency,
        description: description,
        date: new Date(),
      });

      const savedMovement = await queryRunner.manager.save(CashMovement, movement);

      // Update cashbox opening balance based on currency
      if (refillDto.currency === Currency.ARS) {
        cashbox.opening_balance_ars = 
          Number(cashbox.opening_balance_ars) + Number(refillDto.amount);
      } else if (refillDto.currency === Currency.USD) {
        cashbox.opening_balance_usd = 
          Number(cashbox.opening_balance_usd) + Number(refillDto.amount);
      }

      await queryRunner.manager.save(Cashbox, cashbox);

      await queryRunner.commitTransaction();

      // Return movement with relations loaded
      return await this.cashMovementRepository.findOne({
        where: { id: savedMovement.id },
        relations: ['cashbox'],
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error refilling cashbox', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string, user: User): Promise<void> {
    // Only Direction can delete cashboxes
    if (user.role.name !== UserRole.DIRECTION) {
      throw new ForbiddenException('Only Direction can delete cashboxes');
    }

    const cashbox = await this.findOne(id, user);
    await this.cashboxRepository.remove(cashbox);
  }

  /**
   * Business Rule: Request explanation for cashbox difference
   * Business Rule: Anyone can request explanation, generates an alert
   */
  async requestExplanation(
    id: string,
    requestDto: RequestExplanationDto,
    user: User,
  ): Promise<{ message: string }> {
    const cashbox = await this.findOne(id, user);

    // Validate cashbox is closed and has a difference
    if (cashbox.status !== CashboxStatus.CLOSED) {
      throw new BadRequestException('Can only request explanation for closed cashboxes');
    }

    const hasDifference = Number(cashbox.difference_ars) !== 0 || Number(cashbox.difference_usd) !== 0;
    if (!hasDifference) {
      throw new BadRequestException('Cashbox has no difference to explain');
    }

    // Generate alert for explanation request
    await this.alertsService.createAlert({
      type: AlertType.CASHBOX_DIFFERENCE,
      severity: AlertSeverity.WARNING,
      title: 'Explicación solicitada para diferencia de caja',
      message: `${user.fullName || user.email} solicita explicación: ${requestDto.message}`,
      cashbox_id: cashbox.id,
      user_id: user.id,
    });

    return { message: 'Explicación solicitada exitosamente. Se ha generado una alerta.' };
  }

  /**
   * Business Rule: Reject difference - only Direction can reject
   * Business Rule: Rejecting a difference resets the approval status
   */
  async rejectDifference(
    id: string,
    rejectDto: RejectDifferenceDto,
    user: User,
  ): Promise<Cashbox> {
    // Only Direction can reject differences
    if (user.role.name !== UserRole.DIRECTION) {
      throw new ForbiddenException('Only Direction can reject cashbox differences');
    }

    const cashbox = await this.findOne(id, user);

    // Validate cashbox is closed and has a difference
    if (cashbox.status !== CashboxStatus.CLOSED) {
      throw new BadRequestException('Can only reject difference for closed cashboxes');
    }

    const hasDifference = Number(cashbox.difference_ars) !== 0 || Number(cashbox.difference_usd) !== 0;
    if (!hasDifference) {
      throw new BadRequestException('Cashbox has no difference to reject');
    }

    // Reset approval status
    cashbox.difference_approved = false;
    cashbox.difference_approved_by_id = null;
    cashbox.difference_approved_at = null;

    const savedCashbox = await this.cashboxRepository.save(cashbox);

    // Generate alert for rejection
    await this.alertsService.createAlert({
      type: AlertType.CASHBOX_DIFFERENCE,
      severity: AlertSeverity.CRITICAL,
      title: 'Diferencia de caja rechazada',
      message: `${user.fullName || user.email} rechazó la diferencia${rejectDto.reason ? `: ${rejectDto.reason}` : ''}`,
      cashbox_id: cashbox.id,
      user_id: user.id,
    });

    return savedCashbox;
  }

  /**
   * Business Rule: Manual adjustment - only Direction can make manual adjustments
   * Business Rule: Manual adjustment creates a movement and updates balances
   */
  async manualAdjustment(
    id: string,
    adjustmentDto: ManualAdjustmentDto,
    user: User,
  ): Promise<Cashbox> {
    // Only Direction can make manual adjustments
    if (user.role.name !== UserRole.DIRECTION) {
      throw new ForbiddenException('Only Direction can make manual adjustments to cashboxes');
    }

    const cashbox = await this.findOne(id, user);

    // Validate cashbox is closed
    if (cashbox.status !== CashboxStatus.CLOSED) {
      throw new BadRequestException('Can only make manual adjustments to closed cashboxes');
    }

    // Use transaction to ensure atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create movement for manual adjustment
      const adjustmentDescription = adjustmentDto.reason
        ? `Ajuste manual: ${adjustmentDto.reason}`
        : 'Ajuste manual realizado por Dirección';

      const movement = queryRunner.manager.create(CashMovement, {
        cashbox_id: id,
        type: adjustmentDto.amount >= 0 ? CashMovementType.INCOME : CashMovementType.EXPENSE,
        amount: Math.abs(adjustmentDto.amount),
        currency: adjustmentDto.currency,
        description: adjustmentDescription,
        date: new Date(),
      });

      await queryRunner.manager.save(CashMovement, movement);

      // Update closing balance based on currency
      if (adjustmentDto.currency === Currency.ARS) {
        cashbox.closing_balance_ars = Number(cashbox.closing_balance_ars) + adjustmentDto.amount;
        // Recalculate difference_ars
        const movements = await queryRunner.manager.find(CashMovement, {
          where: { cashbox_id: id },
        });
        let totalIngresosArs = 0;
        let totalEgresosArs = 0;
        movements.forEach((m) => {
          if (m.currency === Currency.ARS) {
            if (m.type === CashMovementType.INCOME || m.type === CashMovementType.REFILL) {
              totalIngresosArs += Number(m.amount);
            } else if (m.type === CashMovementType.EXPENSE) {
              totalEgresosArs += Number(m.amount);
            }
          }
        });
        const openingBalanceArs = Number(cashbox.opening_balance_ars);
        cashbox.difference_ars = Number(cashbox.closing_balance_ars) - (openingBalanceArs + totalIngresosArs - totalEgresosArs);
      } else if (adjustmentDto.currency === Currency.USD) {
        cashbox.closing_balance_usd = Number(cashbox.closing_balance_usd) + adjustmentDto.amount;
        // Recalculate difference_usd
        const movements = await queryRunner.manager.find(CashMovement, {
          where: { cashbox_id: id },
        });
        let totalIngresosUsd = 0;
        let totalEgresosUsd = 0;
        movements.forEach((m) => {
          if (m.currency === Currency.USD) {
            if (m.type === CashMovementType.INCOME || m.type === CashMovementType.REFILL) {
              totalIngresosUsd += Number(m.amount);
            } else if (m.type === CashMovementType.EXPENSE) {
              totalEgresosUsd += Number(m.amount);
            }
          }
        });
        const openingBalanceUsd = Number(cashbox.opening_balance_usd);
        cashbox.difference_usd = Number(cashbox.closing_balance_usd) - (openingBalanceUsd + totalIngresosUsd - totalEgresosUsd);
      }

      // Reset approval status after manual adjustment
      cashbox.difference_approved = false;
      cashbox.difference_approved_by_id = null;
      cashbox.difference_approved_at = null;

      await queryRunner.manager.save(Cashbox, cashbox);

      await queryRunner.commitTransaction();

      // Generate alert for manual adjustment
      await this.alertsService.createAlert({
        type: AlertType.CASHBOX_DIFFERENCE,
        severity: AlertSeverity.WARNING,
        title: 'Ajuste manual realizado',
        message: `${user.fullName || user.email} realizó un ajuste manual de ${adjustmentDto.amount >= 0 ? '+' : ''}${adjustmentDto.amount.toFixed(2)} ${adjustmentDto.currency}${adjustmentDto.reason ? `: ${adjustmentDto.reason}` : ''}`,
        cashbox_id: cashbox.id,
        user_id: user.id,
      });

      // Return updated cashbox
      return await this.cashboxRepository.findOne({
        where: { id },
        relations: ['user', 'movements'],
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error making manual adjustment', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getHistory(
    id: string,
    filters: GetHistoryDto,
    user: User,
  ): Promise<{
    data: CashMovement[];
    total: number;
    page: number;
    limit: number;
    summary: {
      totalRefills: number;
      totalExpenses: number;
      totalIncomes: number;
      totalRefillsAmount: number;
      totalExpensesAmount: number;
      totalIncomesAmount: number;
    };
  }> {
    // Verify cashbox exists and user has access
    const cashbox = await this.findOne(id, user);

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    // Build query for movements
    const queryBuilder = this.cashMovementRepository
      .createQueryBuilder('movement')
      .where('movement.cashbox_id = :cashboxId', { cashboxId: id });

    // Apply filters
    if (filters.type) {
      queryBuilder.andWhere('movement.type = :type', { type: filters.type });
    }

    if (filters.currency) {
      queryBuilder.andWhere('movement.currency = :currency', { currency: filters.currency });
    }

    if (filters.startDate) {
      queryBuilder.andWhere('movement.date >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      queryBuilder.andWhere('movement.date <= :endDate', { endDate: filters.endDate });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Get paginated data
    const movements = await queryBuilder
      .orderBy('movement.date', 'DESC')
      .addOrderBy('movement.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    // Calculate summary (all movements for this cashbox, ignoring pagination)
    const allMovements = await this.cashMovementRepository.find({
      where: { cashbox_id: id },
    });

    let totalRefills = 0;
    let totalExpenses = 0;
    let totalIncomes = 0;
    let totalRefillsAmount = 0;
    let totalExpensesAmount = 0;
    let totalIncomesAmount = 0;

    allMovements.forEach((movement) => {
      const amount = Number(movement.amount);
      if (movement.type === CashMovementType.REFILL) {
        totalRefills++;
        totalRefillsAmount += amount;
      } else if (movement.type === CashMovementType.EXPENSE) {
        totalExpenses++;
        totalExpensesAmount += amount;
      } else if (movement.type === CashMovementType.INCOME) {
        totalIncomes++;
        totalIncomesAmount += amount;
      }
    });

    return {
      data: movements,
      total,
      page,
      limit,
      summary: {
        totalRefills,
        totalExpenses,
        totalIncomes,
        totalRefillsAmount,
        totalExpensesAmount,
        totalIncomesAmount,
      },
    };
  }
}

