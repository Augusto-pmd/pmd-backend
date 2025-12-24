import { Injectable } from '@nestjs/common';
import { AlertsService } from '../alerts/alerts.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { ContractsService } from '../contracts/contracts.service';

@Injectable()
export class TasksService {
  constructor(
    private alertsService: AlertsService,
    private suppliersService: SuppliersService,
    private contractsService: ContractsService,
  ) {}

  /**
   * Run all automatic checks
   * This should be called by a cron job or scheduled task
   * Recommended: Run daily at midnight
   */
  async runDailyChecks(): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.log('Running daily automatic checks...');
    }

    // Check for expired supplier documentation and auto-block
    await this.suppliersService.checkAndBlockExpiredDocuments();

    // Check for contracts with zero balance and auto-block
    await this.contractsService.checkAndBlockZeroBalanceContracts();

    // Run all automatic alert checks
    await this.alertsService.runAutomaticChecks();

    if (process.env.NODE_ENV === 'development') {
      console.log('Daily checks completed');
    }
  }
}

