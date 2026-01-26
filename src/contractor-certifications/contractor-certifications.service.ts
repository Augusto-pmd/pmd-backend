import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContractorCertification } from './contractor-certifications.entity';
import { CreateContractorCertificationDto } from './dto/create-contractor-certification.dto';
import { UpdateContractorCertificationDto } from './dto/update-contractor-certification.dto';
import { Supplier } from '../suppliers/suppliers.entity';
import { SupplierType } from '../common/enums/supplier-type.enum';
import { Contract } from '../contracts/contracts.entity';
import { ContractStatus } from '../common/enums/contract-status.enum';
import { User } from '../users/user.entity';
import { getOrganizationId } from '../common/helpers/get-organization-id.helper';
import { ExpensesService } from '../expenses/expenses.service';
import { AlertsService } from '../alerts/alerts.service';
import { Alert } from '../alerts/alerts.entity';
import { AlertType, AlertSeverity, AlertStatus } from '../common/enums';
import { ExpenseState } from '../common/enums/expense-state.enum';
import { ValidateExpenseDto } from '../expenses/dto/validate-expense.dto';

function getWeekStartDate(date: Date): Date {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException('Fecha inválida');
  }
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

@Injectable()
export class ContractorCertificationsService {
  private readonly logger = new Logger(ContractorCertificationsService.name);

  constructor(
    @InjectRepository(ContractorCertification)
    private readonly certificationsRepository: Repository<ContractorCertification>,
    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>,
    @InjectRepository(Contract)
    private readonly contractsRepository: Repository<Contract>,
    @InjectRepository(Alert)
    private readonly alertsRepository: Repository<Alert>,
    private readonly expensesService: ExpensesService,
    private readonly alertsService: AlertsService,
  ) {}

  private async ensureContractorSupplier(supplierId: string): Promise<Supplier> {
    const supplier = await this.suppliersRepository.findOne({
      where: { id: supplierId },
      relations: ['contracts'],
    });
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${supplierId} not found`);
    }
    if (supplier.type !== SupplierType.CONTRACTOR) {
      throw new BadRequestException(
        'Solo se pueden crear certificaciones para suppliers con type=contractor',
      );
    }
    return supplier;
  }

  private async pickContractForSupplier(
    supplierId: string,
    contractId?: string,
  ): Promise<Contract> {
    if (contractId) {
      const contract = await this.contractsRepository.findOne({
        where: { id: contractId },
      });
      if (!contract) {
        throw new NotFoundException(`Contract with ID ${contractId} not found`);
      }
      if (contract.supplier_id !== supplierId) {
        throw new BadRequestException('El contrato no pertenece al supplier indicado');
      }
      if (contract.is_blocked) {
        throw new BadRequestException('El contrato está bloqueado');
      }
      return contract;
    }

    // Prefer ACTIVE, then APPROVED, then PENDING; newest first
    const qb = this.contractsRepository
      .createQueryBuilder('contract')
      .where('contract.supplier_id = :supplier_id', { supplier_id: supplierId })
      .andWhere('contract.is_blocked = false')
      .andWhere('contract.status IN (:...statuses)', {
        statuses: [ContractStatus.ACTIVE, ContractStatus.APPROVED, ContractStatus.PENDING],
      })
      .orderBy(
        `CASE 
          WHEN contract.status = :active THEN 0
          WHEN contract.status = :approved THEN 1
          ELSE 2
        END`,
        'ASC',
      )
      .addOrderBy('contract.created_at', 'DESC')
      .setParameters({
        active: ContractStatus.ACTIVE,
        approved: ContractStatus.APPROVED,
      });

    const contract = await qb.getOne();
    if (!contract) {
      throw new BadRequestException(
        'El supplier contratista no tiene un contrato activo/aprobado. Creá un contrato antes de certificar.',
      );
    }
    return contract;
  }

  private async recalculateSupplierTotals(supplierId: string): Promise<void> {
    const supplier = await this.suppliersRepository.findOne({ where: { id: supplierId } });
    if (!supplier) return;
    if (supplier.type !== SupplierType.CONTRACTOR) return;

    const row = await this.certificationsRepository
      .createQueryBuilder('cert')
      .select('COALESCE(SUM(cert.amount), 0)', 'total')
      .where('cert.supplier_id = :supplierId', { supplierId })
      .getRawOne<{ total: string }>();

    const totalPaid = Number(row?.total ?? 0);
    supplier.contractor_total_paid = totalPaid;

    const budget =
      supplier.contractor_budget !== null && supplier.contractor_budget !== undefined
        ? Number(supplier.contractor_budget)
        : null;
    supplier.contractor_remaining_balance =
      budget !== null && !Number.isNaN(budget) ? budget - totalPaid : null;

    await this.suppliersRepository.save(supplier);

    // Alert when remaining balance < 20% of budget
    if (
      budget !== null &&
      budget > 0 &&
      supplier.contractor_remaining_balance !== null &&
      supplier.contractor_remaining_balance < budget * 0.2
    ) {
      const existing = await this.alertsRepository.findOne({
        where: {
          type: AlertType.CONTRACTOR_BUDGET_LOW,
          supplier_id: supplierId,
          is_read: false,
          status: AlertStatus.OPEN,
        },
      });

      if (!existing) {
        await this.alertsService.createAlert({
          type: AlertType.CONTRACTOR_BUDGET_LOW,
          severity: AlertSeverity.WARNING,
          title: 'Presupuesto de contratista casi consumido',
          message: `El contratista ${supplier.name} tiene un saldo restante menor al 20% del presupuesto (saldo: ${supplier.contractor_remaining_balance?.toFixed?.(2) ?? supplier.contractor_remaining_balance}).`,
          supplier_id: supplierId,
        });
      }
    }
  }

  async create(dto: CreateContractorCertificationDto, user: User): Promise<ContractorCertification> {
    const supplier = await this.ensureContractorSupplier(dto.supplier_id);
    const weekStart = getWeekStartDate(new Date(dto.week_start_date));
    const weekStr = toIsoDate(weekStart);

    const existing = await this.certificationsRepository
      .createQueryBuilder('cert')
      .where('cert.supplier_id = :supplier_id', { supplier_id: dto.supplier_id })
      .andWhere('cert.week_start_date = :week_start_date', { week_start_date: weekStr })
      .getOne();

    if (existing) {
      throw new BadRequestException(
        `Ya existe una certificación para este contratista en la semana ${weekStr}`,
      );
    }

    const contract = await this.pickContractForSupplier(dto.supplier_id, dto.contract_id);
    const organizationId = getOrganizationId(user);

    const certification = this.certificationsRepository.create({
      supplier_id: dto.supplier_id,
      week_start_date: weekStart,
      amount: dto.amount,
      description: dto.description ?? null,
      contract_id: contract.id,
      organization_id: supplier.organization_id ?? organizationId,
    });

    const saved = await this.certificationsRepository.save(certification);

    // Auto-create expense (best-effort; keep certification even if expense fails)
    try {
      if (!saved.expense_id) {
        await this.expensesService.createFromContractorCertification(saved.id, user);
      }
    } catch (err: unknown) {
      this.logger.warn(
        `No se pudo crear gasto automático para certification ${saved.id}: ${
          err instanceof Error ? err.message : 'error'
        }`,
      );
    }

    await this.recalculateSupplierTotals(dto.supplier_id);

    return await this.findOne(saved.id);
  }

  async findAll(
    user: User,
    filters?: { filterByOrganization?: boolean; supplier_id?: string; week_start_date?: string },
  ): Promise<ContractorCertification[]> {
    const organizationId = getOrganizationId(user);
    const filterByOrg = filters?.filterByOrganization === true;

    const qb = this.certificationsRepository
      .createQueryBuilder('cert')
      .leftJoinAndSelect('cert.supplier', 'supplier')
      .leftJoinAndSelect('cert.expense', 'expense')
      .leftJoinAndSelect('cert.contract', 'contract')
      .leftJoinAndSelect('contract.work', 'work')
      .orderBy('cert.week_start_date', 'DESC')
      .addOrderBy('cert.created_at', 'DESC');

    if (filterByOrg && organizationId) {
      qb.andWhere('cert.organization_id = :organizationId', { organizationId });
    }

    if (filters?.supplier_id) {
      qb.andWhere('cert.supplier_id = :supplier_id', { supplier_id: filters.supplier_id });
    }

    if (filters?.week_start_date) {
      const weekStart = getWeekStartDate(new Date(filters.week_start_date));
      qb.andWhere('cert.week_start_date = :week_start_date', {
        week_start_date: toIsoDate(weekStart),
      });
    }

    return await qb.getMany();
  }

  async findOne(id: string): Promise<ContractorCertification> {
    const certification = await this.certificationsRepository.findOne({
      where: { id },
      relations: ['supplier', 'expense', 'contract', 'contract.work'],
    });
    if (!certification) {
      throw new NotFoundException(`ContractorCertification with ID ${id} not found`);
    }
    return certification;
  }

  async findBySupplier(
    supplierId: string,
    user: User,
    filterByOrganization = false,
  ): Promise<ContractorCertification[]> {
    return this.findAll(user, {
      filterByOrganization,
      supplier_id: supplierId,
    });
  }

  async findByWeek(
    weekStartDate: string,
    user: User,
    filterByOrganization = false,
  ): Promise<ContractorCertification[]> {
    return this.findAll(user, {
      filterByOrganization,
      week_start_date: weekStartDate,
    });
  }

  async update(
    id: string,
    dto: UpdateContractorCertificationDto,
    user: User,
  ): Promise<ContractorCertification> {
    const certification = await this.certificationsRepository.findOne({
      where: { id },
      relations: ['supplier', 'expense', 'contract'],
    });
    if (!certification) {
      throw new NotFoundException(`ContractorCertification with ID ${id} not found`);
    }

    // Immutable: supplier_id
    await this.ensureContractorSupplier(certification.supplier_id);

    if (dto.week_start_date) {
      certification.week_start_date = getWeekStartDate(new Date(dto.week_start_date));
    }
    if (dto.amount !== undefined) {
      certification.amount = dto.amount;
    }
    if (dto.description !== undefined) {
      certification.description = dto.description ?? null;
    }
    if (dto.contract_id !== undefined) {
      const contract = dto.contract_id
        ? await this.pickContractForSupplier(certification.supplier_id, dto.contract_id)
        : await this.pickContractForSupplier(certification.supplier_id);
      certification.contract_id = contract.id;
    }

    const saved = await this.certificationsRepository.save(certification);

    // If expense missing, try to create it
    try {
      if (!saved.expense_id) {
        await this.expensesService.createFromContractorCertification(saved.id, user);
      }
    } catch (err: unknown) {
      this.logger.warn(
        `No se pudo crear gasto automático para certification ${saved.id}: ${
          err instanceof Error ? err.message : 'error'
        }`,
      );
    }

    await this.recalculateSupplierTotals(saved.supplier_id);
    return await this.findOne(saved.id);
  }

  async remove(id: string, user: User): Promise<{ deleted: boolean }> {
    const certification = await this.certificationsRepository.findOne({
      where: { id },
      relations: ['expense'],
    });
    if (!certification) {
      throw new NotFoundException(`ContractorCertification with ID ${id} not found`);
    }

    // If an expense exists, annul it via standard flow (keeps accounting/contract balances consistent)
    if (certification.expense_id) {
      try {
        const expense = certification.expense;
        if (expense && expense.state !== ExpenseState.ANNULLED && expense.state !== ExpenseState.REJECTED) {
          const dto: ValidateExpenseDto = {
            state: ExpenseState.ANNULLED,
            observations: `Anulado automáticamente por eliminación de certificación ${certification.id}`,
          };
          await this.expensesService.validate(
            certification.expense_id,
            dto,
            user,
          );
        }
      } catch (err: unknown) {
        this.logger.warn(
          `No se pudo anular el gasto asociado a certification ${certification.id}: ${
            err instanceof Error ? err.message : 'error'
          }`,
        );
      }
    }

    const supplierId = certification.supplier_id;
    await this.certificationsRepository.remove(certification);
    await this.recalculateSupplierTotals(supplierId);
    return { deleted: true };
  }
}

