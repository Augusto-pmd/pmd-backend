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

@Injectable()
export class CashboxesService {
  constructor(
    @InjectRepository(Cashbox)
    private cashboxRepository: Repository<Cashbox>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
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

      // Supervisors and above can see all cashboxes
      return await this.cashboxRepository.find({
        relations: ['user', 'movements'],
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      console.error('[CashboxesService.findAll] Error:', error);
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

    // Calculate differences
    const differenceArs =
      closeCashboxDto.closing_balance_ars - cashbox.opening_balance_ars;
    const differenceUsd =
      closeCashboxDto.closing_balance_usd - cashbox.opening_balance_usd;

    cashbox.closing_balance_ars = closeCashboxDto.closing_balance_ars || 0;
    cashbox.closing_balance_usd = closeCashboxDto.closing_balance_usd || 0;
    cashbox.difference_ars = differenceArs;
    cashbox.difference_usd = differenceUsd;
    cashbox.closing_date = closeCashboxDto.closing_date
      ? new Date(closeCashboxDto.closing_date)
      : new Date();
    cashbox.status = CashboxStatus.CLOSED;

    const savedCashbox = await this.cashboxRepository.save(cashbox);

    // Generate alert if there's a difference
    if (differenceArs !== 0 || differenceUsd !== 0) {
      await this.alertsService.createAlert({
        type: AlertType.CASHBOX_DIFFERENCE,
        severity:
          Math.abs(differenceArs) > 1000 || Math.abs(differenceUsd) > 100
            ? AlertSeverity.CRITICAL
            : AlertSeverity.WARNING,
        title: `Cashbox difference detected`,
        message: `Cashbox ${cashbox.id} has a difference: ARS ${differenceArs}, USD ${differenceUsd}`,
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

