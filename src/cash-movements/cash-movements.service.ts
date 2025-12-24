import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CashMovement } from './cash-movements.entity';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { UpdateCashMovementDto } from './dto/update-cash-movement.dto';
import { User } from '../users/user.entity';
import { Cashbox } from '../cashboxes/cashboxes.entity';
import { CashboxStatus } from '../common/enums/cashbox-status.enum';
import { CashMovementType } from '../common/enums/cash-movement-type.enum';
import { Currency } from '../common/enums/currency.enum';

@Injectable()
export class CashMovementsService {
  constructor(
    @InjectRepository(CashMovement)
    private cashMovementRepository: Repository<CashMovement>,
    @InjectRepository(Cashbox)
    private cashboxRepository: Repository<Cashbox>,
    private dataSource: DataSource,
  ) {}

  async create(createCashMovementDto: CreateCashMovementDto, user: User): Promise<CashMovement> {
    // Usar transacción para asegurar atomicidad
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Validar que la caja existe y está abierta
      const cashbox = await queryRunner.manager.findOne(Cashbox, {
        where: { id: createCashMovementDto.cashbox_id },
      });

      if (!cashbox) {
        throw new NotFoundException(
          `Cashbox with ID ${createCashMovementDto.cashbox_id} not found`,
        );
      }

      if (cashbox.status !== CashboxStatus.OPEN) {
        throw new BadRequestException(
          'Cannot create movement in a closed cashbox. Please open the cashbox first.',
        );
      }

      // 2. Crear el movimiento
      const movement = queryRunner.manager.create(CashMovement, createCashMovementDto);
      const savedMovement = await queryRunner.manager.save(CashMovement, movement);

      // 3. Si es REFILL, actualizar saldo de caja
      if (createCashMovementDto.type === CashMovementType.REFILL) {
        if (createCashMovementDto.currency === Currency.ARS) {
          cashbox.opening_balance_ars =
            Number(cashbox.opening_balance_ars) + Number(createCashMovementDto.amount);
        } else if (createCashMovementDto.currency === Currency.USD) {
          cashbox.opening_balance_usd =
            Number(cashbox.opening_balance_usd) + Number(createCashMovementDto.amount);
        }

        await queryRunner.manager.save(Cashbox, cashbox);
      }

      // 4. Commit de la transacción
      await queryRunner.commitTransaction();

      // Retornar movimiento con relaciones cargadas
      return await this.cashMovementRepository.findOne({
        where: { id: savedMovement.id },
        relations: ['cashbox', 'expense', 'income'],
      });
    } catch (error) {
      // Rollback en caso de error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Liberar query runner
      await queryRunner.release();
    }
  }

  async findAll(user: User): Promise<CashMovement[]> {
    try {
      return await this.cashMovementRepository.find({
        relations: ['cashbox', 'expense', 'income'],
        order: { date: 'DESC' },
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[CashMovementsService.findAll] Error:', error);
      }
      return [];
    }
  }

  async findOne(id: string, user: User): Promise<CashMovement> {
    const movement = await this.cashMovementRepository.findOne({
      where: { id },
      relations: ['cashbox', 'expense', 'income'],
    });

    if (!movement) {
      throw new NotFoundException(`Cash movement with ID ${id} not found`);
    }

    return movement;
  }

  async update(
    id: string,
    updateCashMovementDto: UpdateCashMovementDto,
    user: User,
  ): Promise<CashMovement> {
    const movement = await this.findOne(id, user);
    Object.assign(movement, updateCashMovementDto);
    return await this.cashMovementRepository.save(movement);
  }

  async remove(id: string, user: User): Promise<void> {
    const movement = await this.findOne(id, user);
    await this.cashMovementRepository.remove(movement);
  }
}

