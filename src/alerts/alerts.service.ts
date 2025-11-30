import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Alert } from './alerts.entity';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { MarkReadAlertDto } from './dto/mark-read-alert.dto';
import { AlertType, AlertSeverity } from '../common/enums';
import { User } from '../users/user.entity';
import { SupplierDocument } from '../supplier-documents/supplier-documents.entity';
import { Expense } from '../expenses/expenses.entity';
import { Contract } from '../contracts/contracts.entity';
import { Schedule } from '../schedule/schedule.entity';
import { SupplierDocumentType } from '../common/enums/supplier-document-type.enum';
import { ExpenseState } from '../common/enums/expense-state.enum';
import { ScheduleState } from '../common/enums/schedule-state.enum';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private alertRepository: Repository<Alert>,
    @InjectRepository(SupplierDocument)
    private supplierDocumentRepository: Repository<SupplierDocument>,
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
    @InjectRepository(Contract)
    private contractRepository: Repository<Contract>,
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
  ) {}

  /**
   * Create alert manually or automatically
   */
  async createAlert(createAlertDto: CreateAlertDto): Promise<Alert> {
    const alert = this.alertRepository.create(createAlertDto);
    return await this.alertRepository.save(alert);
  }

  /**
   * Auto-generate alerts for expired documentation
   */
  async checkExpiredDocumentation(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiredDocs = await this.supplierDocumentRepository.find({
      where: {
        expiration_date: LessThan(today),
        is_valid: true,
      },
      relations: ['supplier'],
    });

    for (const doc of expiredDocs) {
      if (doc.supplier) {
        const severity =
          doc.document_type === SupplierDocumentType.ART
            ? AlertSeverity.CRITICAL
            : AlertSeverity.WARNING;

        await this.createAlert({
          type: AlertType.EXPIRED_DOCUMENTATION,
          severity,
          title: `Expired ${doc.document_type} documentation`,
          message: `Supplier ${doc.supplier.name} has expired ${doc.document_type} (expired: ${doc.expiration_date})`,
          supplier_id: doc.supplier.id,
        });
      }
    }
  }

  /**
   * Auto-generate alerts for cashbox differences
   * (Called from cashbox service when closing)
   */

  /**
   * Auto-generate alerts for contracts with zero balance
   * (Called from contract service)
   */

  /**
   * Auto-generate alerts for duplicate invoices
   * (Called from expense service)
   */

  /**
   * Auto-generate alerts for observed expenses
   * (Called from expense service when validating)
   */

  /**
   * Auto-generate alerts for pending validations
   */
  async checkPendingValidations(): Promise<void> {
    // Check pending expenses older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const pendingExpenses = await this.expenseRepository.find({
      where: {
        state: ExpenseState.PENDING,
      },
    });

    for (const expense of pendingExpenses) {
      if (new Date(expense.created_at) < sevenDaysAgo) {
        await this.createAlert({
          type: AlertType.MISSING_VALIDATION,
          severity: AlertSeverity.WARNING,
          title: 'Pending expense validation',
          message: `Expense ${expense.id} has been pending validation for more than 7 days`,
          expense_id: expense.id,
          user_id: expense.created_by_id,
        });
      }
    }

    // Check provisional suppliers older than 3 days
    // This would require supplier repository injection
  }

  /**
   * Auto-generate alerts for overdue work stages
   */
  async checkOverdueStages(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueStages = await this.scheduleRepository.find({
      where: {
        state: ScheduleState.IN_PROGRESS,
      },
    });

    for (const stage of overdueStages) {
      if (new Date(stage.end_date) < today && !stage.actual_end_date) {
        await this.createAlert({
          type: AlertType.OVERDUE_STAGE,
          severity: AlertSeverity.WARNING,
          title: 'Overdue work stage',
          message: `Stage "${stage.stage_name}" for work ${stage.work_id} is overdue (end date: ${stage.end_date})`,
          work_id: stage.work_id,
        });
      }
    }
  }

  /**
   * Run all automatic alert checks
   * This should be called by a scheduled task (cron job)
   */
  async runAutomaticChecks(): Promise<void> {
    await this.checkExpiredDocumentation();
    await this.checkPendingValidations();
    await this.checkOverdueStages();
  }

  async findAll(user: User): Promise<Alert[]> {
    return await this.alertRepository.find({
      where: user.role.name === 'operator' ? { user_id: user.id } : {},
      relations: ['user', 'work', 'supplier', 'expense', 'contract', 'cashbox'],
      order: { created_at: 'DESC' },
    });
  }

  async findUnread(user: User): Promise<Alert[]> {
    return await this.alertRepository.find({
      where: {
        is_read: false,
        ...(user.role.name === 'operator' ? { user_id: user.id } : {}),
      },
      relations: ['user', 'work', 'supplier', 'expense', 'contract', 'cashbox'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string, user: User): Promise<Alert> {
    const alert = await this.alertRepository.findOne({
      where: { id },
      relations: ['user', 'work', 'supplier', 'expense', 'contract', 'cashbox'],
    });

    if (!alert) {
      throw new NotFoundException(`Alert with ID ${id} not found`);
    }

    // Operators can only see their own alerts
    if (user.role.name === 'operator' && alert.user_id !== user.id) {
      throw new ForbiddenException('You can only access your own alerts');
    }

    return alert;
  }

  async markAsRead(id: string, markReadDto: MarkReadAlertDto, user: User): Promise<Alert> {
    const alert = await this.findOne(id, user);
    alert.is_read = markReadDto.is_read !== undefined ? markReadDto.is_read : true;
    return await this.alertRepository.save(alert);
  }

  async update(id: string, updateAlertDto: UpdateAlertDto, user: User): Promise<Alert> {
    const alert = await this.findOne(id, user);
    Object.assign(alert, updateAlertDto);
    return await this.alertRepository.save(alert);
  }

  async remove(id: string, user: User): Promise<void> {
    // Only Direction can delete alerts
    if (user.role.name !== 'direction') {
      throw new ForbiddenException('Only Direction can delete alerts');
    }

    const alert = await this.findOne(id, user);
    await this.alertRepository.remove(alert);
  }
}

