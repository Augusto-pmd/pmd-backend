import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AlertsService } from '../alerts/alerts.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { ContractsService } from '../contracts/contracts.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private alertsService: AlertsService,
    private suppliersService: SuppliersService,
    private contractsService: ContractsService,
  ) {}

  /**
   * Run all automatic checks
   * Scheduled to run daily at midnight (00:00:00)
   * Cron expression: '0 0 * * *' = Every day at 00:00:00
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'daily-automatic-checks',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  async runDailyChecks(): Promise<void> {
    this.logger.log('Starting daily automatic checks...');

    try {
      // Check for expired supplier documentation and auto-block
      this.logger.log('Checking expired supplier documentation...');
      await this.suppliersService.checkAndBlockExpiredDocuments();

      // Check for contracts with zero balance and auto-block
      this.logger.log('Checking contracts with zero balance...');
      await this.contractsService.checkAndBlockZeroBalanceContracts();

      // Run all automatic alert checks
      this.logger.log('Running automatic alert checks...');
      await this.alertsService.runAutomaticChecks();

      this.logger.log('Daily automatic checks completed successfully');
    } catch (error) {
      this.logger.error('Error during daily automatic checks:', error);
      throw error;
    }
  }

  /**
   * Manual trigger for daily checks (for testing or manual execution)
   * Can be called via API endpoint if needed
   */
  async runDailyChecksManually(): Promise<void> {
    this.logger.log('Manual trigger: Starting daily automatic checks...');
    await this.runDailyChecks();
  }
}

