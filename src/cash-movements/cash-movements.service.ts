import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashMovement } from './cash-movements.entity';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { UpdateCashMovementDto } from './dto/update-cash-movement.dto';
import { User } from '../users/user.entity';

@Injectable()
export class CashMovementsService {
  constructor(
    @InjectRepository(CashMovement)
    private cashMovementRepository: Repository<CashMovement>,
  ) {}

  async create(createCashMovementDto: CreateCashMovementDto, user: User): Promise<CashMovement> {
    const movement = this.cashMovementRepository.create(createCashMovementDto);
    return await this.cashMovementRepository.save(movement);
  }

  async findAll(user: User): Promise<CashMovement[]> {
    try {
      return await this.cashMovementRepository.find({
        relations: ['cashbox', 'expense', 'income'],
        order: { date: 'DESC' },
      });
    } catch (error) {
      console.error('[CashMovementsService.findAll] Error:', error);
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

