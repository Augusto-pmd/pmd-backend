import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
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
import { Work } from '../works/works.entity';
import { getOrganizationId } from '../common/helpers/get-organization-id.helper';

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    @InjectRepository(Contract)
    private contractRepository: Repository<Contract>,
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
    @InjectRepository(Work)
    private workRepository: Repository<Work>,
    private alertsService: AlertsService,
  ) {}

  async create(createContractDto: CreateContractDto, user: User): Promise<Contract> {
    // Validate date range: end_date must be after start_date
    if (createContractDto.start_date && createContractDto.end_date) {
      const startDate = new Date(createContractDto.start_date);
      const endDate = new Date(createContractDto.end_date);
      if (endDate <= startDate) {
        throw new BadRequestException('end_date must be after start_date');
      }
    }

    // Validate amount_executed <= amount_total
    if (createContractDto.amount_executed !== undefined) {
      if (createContractDto.amount_executed < 0) {
        throw new BadRequestException('amount_executed must be greater than or equal to 0');
      }
      if (createContractDto.amount_executed > createContractDto.amount_total) {
        throw new BadRequestException('amount_executed cannot exceed amount_total');
      }
    }

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
      const organizationId = getOrganizationId(user);
      const queryBuilder = this.contractRepository
        .createQueryBuilder('contract')
        .leftJoinAndSelect('contract.work', 'work')
        .leftJoinAndSelect('contract.supplier', 'supplier')
        .leftJoinAndSelect('contract.rubric', 'rubric');

      // Filter by organization_id through work
      if (organizationId) {
        queryBuilder.where('work.organization_id = :organizationId', { organizationId });
      }

      return await queryBuilder.orderBy('contract.created_at', 'DESC').getMany();
    } catch (error) {
      this.logger.error('Error fetching contracts', error);
      return [];
    }
  }

  async findOne(id: string, user: User): Promise<Contract> {
    const organizationId = getOrganizationId(user);
    const contract = await this.contractRepository.findOne({
      where: { id },
      relations: ['work', 'supplier', 'rubric'],
    });

    if (!contract) {
      throw new NotFoundException(`Contract with ID ${id} not found`);
    }

    // Validate ownership through work.organization_id
    if (organizationId && contract.work?.organization_id !== organizationId) {
      throw new ForbiddenException('Contract does not belong to your organization');
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

    // Validate amount_executed is not negative
    if (updateContractDto.amount_executed !== undefined && updateContractDto.amount_executed < 0) {
      throw new BadRequestException('amount_executed cannot be negative');
    }

    // Validate amount_total is not negative
    if (updateContractDto.amount_total !== undefined && updateContractDto.amount_total < 0) {
      throw new BadRequestException('amount_total cannot be negative');
    }

    // Update amount_executed
    if (updateContractDto.amount_executed !== undefined) {
      const previousAmountExecuted = Number(contract.amount_executed);
      const newAmountExecuted = updateContractDto.amount_executed;
      const amountTotal = Number(contract.amount_total);
      
      // Validate amount_executed <= amount_total
      if (newAmountExecuted > amountTotal) {
        throw new BadRequestException('amount_executed cannot exceed amount_total');
      }
      
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
    
    // Validate date range: end_date must be after start_date
    const newStartDate = updateContractDto.start_date
      ? new Date(updateContractDto.start_date)
      : contract.start_date;
    const newEndDate = updateContractDto.end_date
      ? new Date(updateContractDto.end_date)
      : contract.end_date;
    
    if (newStartDate && newEndDate) {
      if (newEndDate <= newStartDate) {
        throw new BadRequestException('end_date must be after start_date');
      }
    }
    
    if (updateContractDto.start_date !== undefined) {
      contract.start_date = newStartDate;
    }
    if (updateContractDto.end_date !== undefined) {
      contract.end_date = newEndDate;
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

