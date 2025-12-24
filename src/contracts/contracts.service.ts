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
import { User } from '../users/user.entity';
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
    try {
      return await this.contractRepository.find({
        relations: ['work', 'supplier', 'rubric'],
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[ContractsService.findAll] Error:', error);
      }
      return [];
    }
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
   * Business Rule: Only Direction can modify amount_total and currency
   * Business Rule: Administration can modify payment_terms, file_url, and other non-critical fields
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

    // Validate permissions for amount_total and currency (only Direction can modify)
    if (
      (updateContractDto.amount_total !== undefined || updateContractDto.currency !== undefined) &&
      user.role.name !== UserRole.DIRECTION
    ) {
      throw new ForbiddenException(
        'Only Direction can modify amount_total and currency fields',
      );
    }

    // Update amount_executed
    if (updateContractDto.amount_executed !== undefined) {
      const previousAmountExecuted = Number(contract.amount_executed);
      const newAmountExecuted = updateContractDto.amount_executed;
      const amountTotal = Number(contract.amount_total);
      
      contract.amount_executed = newAmountExecuted;

      // Calculate saldo: amount_total - amount_executed
      const saldo = amountTotal - newAmountExecuted;

      // Auto-block if saldo <= 0 (amount_executed >= amount_total)
      const wasBlocked = contract.is_blocked;
      if (saldo <= 0) {
        contract.is_blocked = true;

        // Generate alert only if contract was not already blocked
        if (!wasBlocked) {
          await this.alertsService.createAlert({
            type: AlertType.CONTRACT_ZERO_BALANCE,
            severity: AlertSeverity.WARNING,
            title: 'Contract balance reached zero',
            message: `Contract ${contract.id} has been automatically blocked. Saldo: ${saldo.toFixed(2)} (amount_total: ${amountTotal.toFixed(2)}, amount_executed: ${newAmountExecuted.toFixed(2)})`,
            contract_id: contract.id,
            work_id: contract.work_id,
          });
        }
      } else if (contract.is_blocked && user.role.name === UserRole.DIRECTION) {
        // Direction can unblock if balance is not zero
        contract.is_blocked = false;
      }
    }

    // Direction can override block status
    if (user.role.name === UserRole.DIRECTION && updateContractDto.hasOwnProperty('is_blocked')) {
      contract.is_blocked = updateContractDto.is_blocked as boolean;
    }

    // Apply updates based on permissions
    // Only Direction can modify amount_total and currency (already validated above)
    if (updateContractDto.amount_total !== undefined) {
      contract.amount_total = updateContractDto.amount_total;
    }
    if (updateContractDto.currency !== undefined) {
      contract.currency = updateContractDto.currency;
    }

    // Administration and Direction can modify other fields
    if (updateContractDto.payment_terms !== undefined) {
      contract.payment_terms = updateContractDto.payment_terms;
    }
    if (updateContractDto.file_url !== undefined) {
      contract.file_url = updateContractDto.file_url;
    }
    if (updateContractDto.start_date !== undefined) {
      contract.start_date = updateContractDto.start_date
        ? new Date(updateContractDto.start_date)
        : null;
    }
    if (updateContractDto.end_date !== undefined) {
      contract.end_date = updateContractDto.end_date
        ? new Date(updateContractDto.end_date)
        : null;
    }

    return await this.contractRepository.save(contract);
  }

  /**
   * Update amount_executed and check for auto-blocking
   * Business Rule: Auto-block contract when saldo <= 0 (amount_executed >= amount_total)
   * Business Rule: Generate alert when contract is blocked
   */
  async updateAmountExecuted(
    contractId: string,
    newAmountExecuted: number,
  ): Promise<Contract> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundException(`Contract with ID ${contractId} not found`);
    }

    const previousAmountExecuted = Number(contract.amount_executed);
    const amountTotal = Number(contract.amount_total);
    contract.amount_executed = newAmountExecuted;

    // Calculate saldo: amount_total - amount_executed
    const saldo = amountTotal - newAmountExecuted;

    // Auto-block if saldo <= 0 (amount_executed >= amount_total)
    const wasBlocked = contract.is_blocked;
    if (saldo <= 0) {
      contract.is_blocked = true;

      // Generate alert only if contract was not already blocked
      if (!wasBlocked) {
        await this.alertsService.createAlert({
          type: AlertType.CONTRACT_ZERO_BALANCE,
          severity: AlertSeverity.WARNING,
          title: 'Contract balance reached zero',
          message: `Contract ${contract.id} has been automatically blocked. Saldo: ${saldo.toFixed(2)} (amount_total: ${amountTotal.toFixed(2)}, amount_executed: ${newAmountExecuted.toFixed(2)})`,
          contract_id: contract.id,
          work_id: contract.work_id,
        });
      }
    } else if (wasBlocked && saldo > 0) {
      // If contract was blocked but now has saldo, keep it blocked
      // (Only Direction can unblock manually)
      contract.is_blocked = true;
    }

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
        severity: AlertSeverity.WARNING,
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

