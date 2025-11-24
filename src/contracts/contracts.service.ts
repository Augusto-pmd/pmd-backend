import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from './contracts.entity';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/users.entity';
import { AlertsService } from '../alerts/alerts.service';
import { AlertType, AlertSeverity } from '../common/enums';
import { Supplier } from '../suppliers/suppliers.entity';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract)
    private contractRepository: Repository<Contract>,
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
    private alertsService: AlertsService,
  ) {}

  async create(createContractDto: CreateContractDto, user: User): Promise<Contract> {
    // Check if supplier is blocked
    const supplier = await this.supplierRepository.findOne({
      where: { id: createContractDto.supplier_id },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${createContractDto.supplier_id} not found`);
    }

    if (supplier.status === 'blocked') {
      throw new BadRequestException('Cannot create contract with blocked supplier');
    }

    const contract = this.contractRepository.create({
      ...createContractDto,
      amount_executed: createContractDto.amount_executed || 0,
      is_blocked: false,
    });

    return await this.contractRepository.save(contract);
  }

  async findAll(user: User): Promise<Contract[]> {
    return await this.contractRepository.find({
      relations: ['work', 'supplier', 'rubric'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string, user: User): Promise<Contract> {
    const contract = await this.contractRepository.findOne({
      where: { id },
      relations: ['work', 'supplier', 'rubric'],
    });

    if (!contract) {
      throw new NotFoundException(`Contract with ID ${id} not found`);
    }

    return contract;
  }

  /**
   * Business Rule: Auto-block contract when amount_executed = amount_total
   * Business Rule: Only Direction can override blocks
   */
  async update(
    id: string,
    updateContractDto: UpdateContractDto,
    user: User,
  ): Promise<Contract> {
    const contract = await this.findOne(id, user);

    // Check if contract is blocked and trying to modify
    if (contract.is_blocked && user.role.name !== UserRole.DIRECTION) {
      throw new ForbiddenException(
        'Contract is blocked. Only Direction can override and modify blocked contracts.',
      );
    }

    // Update amount_executed
    if (updateContractDto.amount_executed !== undefined) {
      contract.amount_executed = updateContractDto.amount_executed;

      // Auto-block if balance reaches zero
      if (contract.amount_executed >= contract.amount_total) {
        contract.is_blocked = true;

        // Generate alert
        await this.alertsService.createAlert({
          type: AlertType.CONTRACT_ZERO_BALANCE,
          severity: AlertSeverity.INFO,
          title: 'Contract balance reached zero',
          message: `Contract ${contract.id} has been automatically blocked as amount_executed (${contract.amount_executed}) equals amount_total (${contract.amount_total})`,
          contract_id: contract.id,
          work_id: contract.work_id,
        });
      } else if (contract.is_blocked && user.role.name === UserRole.DIRECTION) {
        // Direction can unblock if balance is not zero
        contract.is_blocked = false;
      }
    }

    // Direction can override block status
    if (user.role.name === UserRole.DIRECTION && updateContractDto.hasOwnProperty('is_blocked')) {
      contract.is_blocked = updateContractDto.is_blocked as boolean;
    }

    Object.assign(contract, updateContractDto);
    return await this.contractRepository.save(contract);
  }

  /**
   * Check and auto-block contracts with zero balance
   * This should be called after expense validation
   */
  async checkAndBlockZeroBalanceContracts(contractId?: string): Promise<void> {
    const queryBuilder = this.contractRepository
      .createQueryBuilder('contract')
      .where('contract.is_blocked = :blocked', { blocked: false })
      .andWhere('contract.amount_executed >= contract.amount_total');

    if (contractId) {
      queryBuilder.andWhere('contract.id = :contractId', { contractId });
    }

    const contracts = await queryBuilder.getMany();

    for (const contract of contracts) {
      contract.is_blocked = true;
      await this.contractRepository.save(contract);

      await this.alertsService.createAlert({
        type: AlertType.CONTRACT_ZERO_BALANCE,
        severity: AlertSeverity.INFO,
        title: 'Contract auto-blocked',
        message: `Contract ${contract.id} has been automatically blocked as balance reached zero`,
        contract_id: contract.id,
        work_id: contract.work_id,
      });
    }
  }

  async remove(id: string, user: User): Promise<void> {
    // Only Direction can delete contracts
    if (user.role.name !== UserRole.DIRECTION) {
      throw new ForbiddenException('Only Direction can delete contracts');
    }

    const contract = await this.findOne(id, user);
    await this.contractRepository.remove(contract);
  }
}

