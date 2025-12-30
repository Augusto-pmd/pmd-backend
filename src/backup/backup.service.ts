import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { Backup, BackupType, BackupStatus } from './backup.entity';
import { StorageService } from '../storage/storage.service';
import { User } from '../users/user.entity';
import { UserRole } from '../common/enums/user-role.enum';

const execAsync = promisify(exec);

interface BackupStatusResponse {
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  pending: number;
  lastBackup: Backup | null;
  lastSuccessfulBackup: Backup | null;
  scheduledJobs: {
    dailyFullBackup: { enabled: boolean; schedule: string };
    incrementalBackup: { enabled: boolean; schedule: string };
    weeklyCleanup: { enabled: boolean; schedule: string };
  };
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupsDirectory: string;

  constructor(
    @InjectRepository(Backup)
    private backupRepository: Repository<Backup>,
    private configService: ConfigService,
    private storageService: StorageService,
  ) {
    // Create backups directory if it doesn't exist
    this.backupsDirectory = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(this.backupsDirectory)) {
      fs.mkdirSync(this.backupsDirectory, { recursive: true });
    }
  }

  /**
   * Get database connection parameters
   */
  private getDatabaseConfig(): {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    requiresSsl: boolean;
  } {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');

    if (databaseUrl) {
      try {
        const parsedUrl = new URL(databaseUrl);
        const sslMode = parsedUrl.searchParams.get('sslmode');

        return {
          host: parsedUrl.hostname,
          port: parseInt(parsedUrl.port || '5432', 10),
          username: parsedUrl.username,
          password: parsedUrl.password,
          database: parsedUrl.pathname.slice(1),
          requiresSsl: sslMode === 'require' || sslMode === 'prefer',
        };
      } catch (error) {
        throw new BadRequestException(`Invalid DATABASE_URL: ${error.message}`);
      }
    }

    // Fallback to individual environment variables
    return {
      host: this.configService.get<string>('DB_HOST', 'localhost'),
      port: this.configService.get<number>('DB_PORT', 5432),
      username: this.configService.get<string>('DB_USERNAME', 'postgres'),
      password: this.configService.get<string>('DB_PASSWORD', 'postgres'),
      database: this.configService.get<string>('DB_DATABASE', 'pmd_management'),
      requiresSsl: false,
    };
  }

  /**
   * Create a full database backup
   */
  async backupDatabase(user?: User): Promise<Backup> {
    // Only Administration and Direction can create backups
    if (user && user.role.name !== UserRole.ADMINISTRATION && user.role.name !== UserRole.DIRECTION) {
      throw new BadRequestException('Only Administration and Direction can create backups');
    }

    const dbConfig = this.getDatabaseConfig();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-full-${timestamp}.sql`;
    const filePath = path.join(this.backupsDirectory, fileName);

    // Create backup record
    const backup = this.backupRepository.create({
      type: BackupType.FULL,
      status: BackupStatus.IN_PROGRESS,
      file_path: filePath,
      file_size: 0,
      created_by_id: user?.id || null,
      started_at: new Date(),
    });

    const savedBackup = await this.backupRepository.save(backup);

    try {
      this.logger.log(`Starting full backup: ${fileName}`);

      // Build pg_dump command
      const env = {
        ...process.env,
        PGPASSWORD: dbConfig.password,
      };

      let pgDumpCommand = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} -F c -f "${filePath}"`;

      if (dbConfig.requiresSsl) {
        pgDumpCommand += ' --no-password';
      }

      // Execute pg_dump
      await execAsync(pgDumpCommand, { env, maxBuffer: 10 * 1024 * 1024 });

      // Get file size
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;

      // Upload to storage (if configured)
      let storageUrl: string | null = null;
      try {
        // Upload to cloud storage (Google Drive/Dropbox) if configured
        // Falls back to local storage if cloud storage is not available
        storageUrl = await this.storageService.uploadFile(filePath, fileName);
        if (storageUrl !== filePath) {
          this.logger.log(`Backup uploaded to cloud storage: ${storageUrl}`);
        }
      } catch (error) {
        this.logger.warn('Failed to upload backup to cloud storage, using local path:', error);
        storageUrl = filePath; // Fallback to local path
      }

      // Update backup record
      savedBackup.status = BackupStatus.COMPLETED;
      savedBackup.file_size = fileSize;
      savedBackup.storage_url = storageUrl;
      savedBackup.completed_at = new Date();

      await this.backupRepository.save(savedBackup);

      this.logger.log(`Full backup completed: ${fileName} (${fileSize} bytes)`);

      return savedBackup;
    } catch (error) {
      this.logger.error(`Backup failed: ${error.message}`, error.stack);

      savedBackup.status = BackupStatus.FAILED;
      savedBackup.error_message = error.message || 'Unknown error';
      savedBackup.completed_at = new Date();

      // Delete failed backup file if it exists
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkError) {
          this.logger.warn('Failed to delete failed backup file:', unlinkError);
        }
      }

      await this.backupRepository.save(savedBackup);

      throw new BadRequestException(`Backup failed: ${error.message}`);
    }
  }

  /**
   * Create an incremental backup (WAL-based)
   * Note: This requires PostgreSQL WAL archiving to be configured
   */
  async backupIncremental(user?: User): Promise<Backup> {
    // Only Administration and Direction can create backups
    if (user && user.role.name !== UserRole.ADMINISTRATION && user.role.name !== UserRole.DIRECTION) {
      throw new BadRequestException('Only Administration and Direction can create backups');
    }

    const dbConfig = this.getDatabaseConfig();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-incremental-${timestamp}.sql`;
    const filePath = path.join(this.backupsDirectory, fileName);

    // Create backup record
    const backup = this.backupRepository.create({
      type: BackupType.INCREMENTAL,
      status: BackupStatus.IN_PROGRESS,
      file_path: filePath,
      file_size: 0,
      created_by_id: user?.id || null,
      started_at: new Date(),
    });

    const savedBackup = await this.backupRepository.save(backup);

    try {
      this.logger.log(`Starting incremental backup: ${fileName}`);

      // For incremental backup, we'll use pg_basebackup or WAL archiving
      // For simplicity, we'll create a dump of only changed tables
      // In production, this should use WAL archiving or pg_basebackup

      const env = {
        ...process.env,
        PGPASSWORD: dbConfig.password,
      };

      // For now, incremental backup is the same as full backup
      // In production, this should use WAL archiving
      let pgDumpCommand = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} -F c -f "${filePath}"`;

      if (dbConfig.requiresSsl) {
        pgDumpCommand += ' --no-password';
      }

      await execAsync(pgDumpCommand, { env, maxBuffer: 10 * 1024 * 1024 });

      const stats = fs.statSync(filePath);
      const fileSize = stats.size;

      let storageUrl: string | null = null;
      try {
        // Upload to cloud storage (Google Drive/Dropbox) if configured
        storageUrl = await this.storageService.uploadFile(filePath, fileName);
        if (storageUrl !== filePath) {
          this.logger.log(`Incremental backup uploaded to cloud storage: ${storageUrl}`);
        }
      } catch (error) {
        this.logger.warn('Failed to upload incremental backup to cloud storage, using local path:', error);
        storageUrl = filePath; // Fallback to local path
      }

      savedBackup.status = BackupStatus.COMPLETED;
      savedBackup.file_size = fileSize;
      savedBackup.storage_url = storageUrl;
      savedBackup.completed_at = new Date();

      await this.backupRepository.save(savedBackup);

      this.logger.log(`Incremental backup completed: ${fileName} (${fileSize} bytes)`);

      return savedBackup;
    } catch (error) {
      this.logger.error(`Incremental backup failed: ${error.message}`, error.stack);

      savedBackup.status = BackupStatus.FAILED;
      savedBackup.error_message = error.message || 'Unknown error';
      savedBackup.completed_at = new Date();

      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkError) {
          this.logger.warn('Failed to delete failed backup file:', unlinkError);
        }
      }

      await this.backupRepository.save(savedBackup);

      throw new BadRequestException(`Incremental backup failed: ${error.message}`);
    }
  }

  /**
   * Get all backups
   */
  async findAll(): Promise<Backup[]> {
    return await this.backupRepository.find({
      order: { created_at: 'DESC' },
      relations: ['created_by'],
    });
  }

  /**
   * Get a backup by ID
   */
  async findOne(id: string): Promise<Backup> {
    const backup = await this.backupRepository.findOne({
      where: { id },
      relations: ['created_by'],
    });

    if (!backup) {
      throw new NotFoundException(`Backup with ID ${id} not found`);
    }

    return backup;
  }

  /**
   * Delete a backup
   */
  async remove(id: string, user?: User): Promise<void> {
    // Only Administration and Direction can delete backups
    if (user && user.role.name !== UserRole.ADMINISTRATION && user.role.name !== UserRole.DIRECTION) {
      throw new BadRequestException('Only Administration and Direction can delete backups');
    }

    const backup = await this.findOne(id);

    // Delete file from filesystem
    if (fs.existsSync(backup.file_path)) {
      try {
        fs.unlinkSync(backup.file_path);
      } catch (error) {
        this.logger.warn(`Failed to delete backup file: ${backup.file_path}`, error);
      }
    }

    // Delete from storage if URL exists
    if (backup.storage_url && backup.storage_url !== backup.file_path) {
      try {
        await this.storageService.deleteFile(backup.storage_url);
      } catch (error) {
        this.logger.warn(`Failed to delete backup from storage: ${backup.storage_url}`, error);
      }
    }

    await this.backupRepository.remove(backup);
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups(daysToKeep: number = 30): Promise<number> {
    this.logger.log(`Cleaning up backups older than ${daysToKeep} days`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const oldBackups = await this.backupRepository.find({
      where: {
        status: BackupStatus.COMPLETED,
      },
    });

    let deletedCount = 0;

    for (const backup of oldBackups) {
      if (backup.created_at < cutoffDate) {
        try {
          await this.remove(backup.id);
          deletedCount++;
        } catch (error) {
          this.logger.error(`Failed to delete old backup ${backup.id}:`, error);
        }
      }
    }

    this.logger.log(`Cleaned up ${deletedCount} old backups`);

    return deletedCount;
  }

  /**
   * Schedule daily full backup
   * Runs every day at 00:00:00 (midnight)
   * Cron expression: '0 0 * * *' = Every day at 00:00:00
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'daily-full-backup',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  async scheduleDailyBackup(): Promise<void> {
    this.logger.log('=== Scheduled daily full backup starting ===');
    
    try {
      const backup = await this.backupDatabase();
      this.logger.log(
        `✅ Daily full backup completed successfully: ${backup.id} (${backup.file_size} bytes)`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Daily full backup failed: ${error.message}`,
        error.stack,
      );
      // Don't throw - let the cron job continue even if one backup fails
    }
  }

  /**
   * Schedule incremental backup
   * Runs every 4 hours
   * Cron expression: Every 4 hours
   */
  @Cron('0 */4 * * *', {
    name: 'incremental-backup',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  async scheduleIncrementalBackup(): Promise<void> {
    this.logger.log('=== Scheduled incremental backup starting ===');
    
    try {
      const backup = await this.backupIncremental();
      this.logger.log(
        `✅ Incremental backup completed successfully: ${backup.id} (${backup.file_size} bytes)`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Incremental backup failed: ${error.message}`,
        error.stack,
      );
      // Don't throw - let the cron job continue even if one backup fails
    }
  }

  /**
   * Schedule cleanup of old backups
   * Runs every week on Sunday at 02:00:00
   * Cron expression: '0 2 * * 0' = Every Sunday at 02:00:00
   */
  @Cron('0 2 * * 0', {
    name: 'weekly-backup-cleanup',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  async scheduleWeeklyCleanup(): Promise<void> {
    this.logger.log('=== Scheduled weekly backup cleanup starting ===');
    
    try {
      const deletedCount = await this.cleanupOldBackups(30); // Keep 30 days by default
      this.logger.log(
        `✅ Weekly backup cleanup completed: ${deletedCount} backups deleted`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Weekly backup cleanup failed: ${error.message}`,
        error.stack,
      );
      // Don't throw - let the cron job continue even if cleanup fails
    }
  }

  /**
   * Get backup file as stream for download
   */
  async getBackupFileStream(id: string): Promise<fs.ReadStream> {
    const backup = await this.findOne(id);

    if (!fs.existsSync(backup.file_path)) {
      throw new NotFoundException(`Backup file not found: ${backup.file_path}`);
    }

    return fs.createReadStream(backup.file_path);
  }

  /**
   * Get recent backup logs
   */
  async getRecentLogs(limit: number = 50): Promise<Backup[]> {
    return await this.backupRepository.find({
      order: { created_at: 'DESC' },
      relations: ['created_by'],
      take: limit,
    });
  }

  /**
   * Get backup status and statistics
   */
  async getStatus(): Promise<BackupStatusResponse> {
    const allBackups = await this.backupRepository.find();

    const completed = allBackups.filter((b) => b.status === BackupStatus.COMPLETED).length;
    const failed = allBackups.filter((b) => b.status === BackupStatus.FAILED).length;
    const inProgress = allBackups.filter((b) => b.status === BackupStatus.IN_PROGRESS).length;
    const pendingCount = allBackups.filter((b) => b.status === BackupStatus.PENDING).length;

    const lastBackup = allBackups.length > 0 
      ? allBackups.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      : null;

    const lastSuccessfulBackup = allBackups
      .filter((b) => b.status === BackupStatus.COMPLETED)
      .sort((a, b) => new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime())[0] || null;

    return {
      total: allBackups.length,
      completed,
      failed,
      inProgress,
      pending: pendingCount,
      lastBackup,
      lastSuccessfulBackup,
      scheduledJobs: {
        dailyFullBackup: {
          enabled: true,
          schedule: 'Every day at 00:00:00 (America/Argentina/Buenos_Aires)',
        },
        incrementalBackup: {
          enabled: true,
          schedule: 'Every 4 hours',
        },
        weeklyCleanup: {
          enabled: true,
          schedule: 'Every Sunday at 02:00:00 (America/Argentina/Buenos_Aires)',
        },
      },
    };
  }
}

