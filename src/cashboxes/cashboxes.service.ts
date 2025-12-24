import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cashbox } from './cashboxes.entity';
import { CreateCashboxDto } from './dto/create-cashbox.dto';
import { UpdateCashboxDto } from './dto/update-cashbox.dto';
import { CloseCashboxDto } from './dto/close-cashbox.dto';
import { ApproveDifferenceDto } from './dto/approve-difference.dto';
import { CashboxStatus } from '../common/enums/cashbox-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/user.entity';
import { AlertsService } from '../alerts/alerts.service';
import { AlertType, AlertSeverity } from '../common/enums';
import { CashMovement } from '../cash-movements/cash-movements.entity';
import { CashMovementType } from '../common/enums/cash-movement-type.enum';
import { Currency } from '../common/enums/currency.enum';

@Injectable()
export class CashboxesService {
  constructor(
    @InjectRepository(Cashbox)
    private cashboxRepository: Repository<Cashbox>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(CashMovement)
    private cashMovementRepository: Repository<CashMovement>,
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
      // Operators can only see their own cashboxes
      if (user?.role?.name === UserRole.OPERATOR) {
        return await this.cashboxRepository.find({
          where: { user_id: user.id },
          relations: ['user', 'movements'],
          order: { created_at: 'DESC' },
        });
      }

      // Direction, Administration, and Supervisor can see all cashboxes (no filter)
      if (
        user?.role?.name === UserRole.DIRECTION ||
        user?.role?.name === UserRole.ADMINISTRATION ||
        user?.role?.name === UserRole.SUPERVISOR
      ) {
        return await this.cashboxRepository.find({
          relations: ['user', 'movements'],
          order: { created_at: 'DESC' },
        });
      }

      // Default: return empty array for unknown roles
      return [];
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[CashboxesService.findAll] Error:', error);
      }
      return [];
    }
  }

  async findOne(id: string, user: User): Promise<Cashbox> {
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

    return cashbox;
  }

  async close(id: string, closeCashboxDto: CloseCashboxDto, user: User): Promise<Cashbox> {
    const cashbox = await this.findOne(id, user);

    if (cashbox.status === CashboxStatus.CLOSED) {
      throw new BadRequestException('Cashbox is already closed');
    }

    // Get all movements for this cashbox to calculate totals
    const movements = await this.cashMovementRepository.find({
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

    const savedCashbox = await this.cashboxRepository.save(cashbox);

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

    return savedCashbox;
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

    Object.assign(cashbox, updateCashboxDto);
    return await this.cashboxRepository.save(cashbox);
  }

  async remove(id: string, user: User): Promise<void> {
    // Only Direction can delete cashboxes
    if (user.role.name !== UserRole.DIRECTION) {
      throw new ForbiddenException('Only Direction can delete cashboxes');
    }

    const cashbox = await this.findOne(id, user);
    await this.cashboxRepository.remove(cashbox);
  }
}

