import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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

export interface BackupStatusResponse {
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
  private pgDumpPath: string | null = null;
  private pgDumpVerified: boolean = false;

  constructor(
    @InjectRepository(Backup)
    private backupRepository: Repository<Backup>,
    @InjectDataSource()
    private dataSource: DataSource,
    private configService: ConfigService,
    private storageService: StorageService,
  ) {
    // Create backups directory if it doesn't exist
    this.backupsDirectory = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(this.backupsDirectory)) {
      fs.mkdirSync(this.backupsDirectory, { recursive: true });
    }
    
    // Initialize pg_dump path on service creation
    this.initializePgDump().catch((error) => {
      this.logger.warn('Failed to initialize pg_dump on startup:', error.message);
    });
  }

  /**
   * Initialize and verify pg_dump availability
   * Called once on service initialization
   */
  private async initializePgDump(): Promise<void> {
    try {
      const pgDumpCmd = await this.getPgDumpCommand();
      const isValid = await this.verifyPgDump(pgDumpCmd);
      
      if (isValid) {
        this.pgDumpPath = pgDumpCmd;
        this.pgDumpVerified = true;
        this.logger.log(`✅ pg_dump initialized successfully: ${pgDumpCmd}`);
      } else {
        // Provide detailed diagnostic information
        const diagnosticInfo = this.getPgDumpDiagnosticInfo();
        this.logger.log('ℹ️ pg_dump not available. Backups will use TypeORM-based method (no external tools required).');
        this.logger.log(`💡 Diagnostic info: ${diagnosticInfo}`);
        this.logger.log('💡 Note: For better performance, you can install PostgreSQL client tools, but it\'s not required.');
        this.logger.log('   Backups will work automatically using TypeORM.');
      }
    } catch (error) {
      this.logger.warn('⚠️ Could not initialize pg_dump:', error.message);
      const diagnosticInfo = this.getPgDumpDiagnosticInfo();
      this.logger.warn(`💡 Diagnostic info: ${diagnosticInfo}`);
    }
  }

  /**
   * Get diagnostic information about pg_dump search
   */
  private getPgDumpDiagnosticInfo(): string {
    const isWindows = process.platform === 'win32';
    const isMac = process.platform === 'darwin';
    const isLinux = process.platform === 'linux';
    
    const envPath = this.configService.get<string>('PG_DUMP_PATH');
    const checkedPaths: string[] = [];
    
    if (envPath) {
      checkedPaths.push(`PG_DUMP_PATH=${envPath} (${fs.existsSync(envPath) ? 'exists' : 'not found'})`);
    }
    
    if (isWindows) {
      checkedPaths.push('Windows PATH');
      checkedPaths.push('C:\\Program Files\\PostgreSQL\\[12-17]\\bin\\pg_dump.exe');
      checkedPaths.push('C:\\Program Files (x86)\\PostgreSQL\\[12-17]\\bin\\pg_dump.exe');
    } else if (isMac) {
      checkedPaths.push('macOS PATH');
      checkedPaths.push('/usr/local/bin/pg_dump');
      checkedPaths.push('/opt/homebrew/bin/pg_dump');
      checkedPaths.push('/Applications/Postgres.app/Contents/Versions/latest/bin/pg_dump');
    } else if (isLinux) {
      checkedPaths.push('Linux PATH');
      checkedPaths.push('/usr/bin/pg_dump');
      checkedPaths.push('/usr/local/bin/pg_dump');
      checkedPaths.push('/opt/postgresql/bin/pg_dump');
    }
    
    return `Platform: ${process.platform}, Checked: ${checkedPaths.join(', ')}`;
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
   * Check if pg_dump is available in the system PATH
   */
  private async isPgDumpAvailable(): Promise<boolean> {
    try {
      // Try to execute pg_dump --version
      // On Windows, use 'where pg_dump' to check availability
      const isWindows = process.platform === 'win32';
      const checkCommand = isWindows ? 'where pg_dump' : 'which pg_dump';
      
      await execAsync(checkCommand, { timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Verify that pg_dump actually works by running --version
   */
  private async verifyPgDump(pgDumpCmd: string): Promise<boolean> {
    try {
      // Check if it's a file path and exists
      if (fs.existsSync(pgDumpCmd)) {
        // Try to execute pg_dump --version to verify it works
        await execAsync(`"${pgDumpCmd}" --version`, { timeout: 5000 });
        return true;
      }
      
      // If it's just 'pg_dump', check if it's in PATH
      if (pgDumpCmd === 'pg_dump') {
        const isAvailable = await this.isPgDumpAvailable();
        if (isAvailable) {
          // Verify it actually works
          try {
            await execAsync('pg_dump --version', { timeout: 5000 });
            return true;
          } catch {
            return false;
          }
        }
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get pg_dump command path
   * Tries to find pg_dump in common PostgreSQL installation paths
   * Supports Windows, Linux, and macOS
   */
  private async getPgDumpCommand(): Promise<string> {
    // First, check if PG_DUMP_PATH environment variable is set
    const envPgDumpPath = this.configService.get<string>('PG_DUMP_PATH');
    if (envPgDumpPath) {
      if (fs.existsSync(envPgDumpPath)) {
        this.logger.debug(`Using pg_dump from PG_DUMP_PATH: ${envPgDumpPath}`);
        return envPgDumpPath;
      } else {
        this.logger.warn(`PG_DUMP_PATH is set but file does not exist: ${envPgDumpPath}`);
      }
    }

    const isWindows = process.platform === 'win32';
    const isMac = process.platform === 'darwin';
    const isLinux = process.platform === 'linux';

    // First, check if pg_dump is in PATH
    const isAvailable = await this.isPgDumpAvailable();
    if (isAvailable) {
      return 'pg_dump';
    }

    // On Windows, try common PostgreSQL installation paths
    if (isWindows) {
      // Check for newer versions first, then older ones
      const commonPaths = [
        'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\13\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\12\\bin\\pg_dump.exe',
        'C:\\Program Files (x86)\\PostgreSQL\\17\\bin\\pg_dump.exe',
        'C:\\Program Files (x86)\\PostgreSQL\\16\\bin\\pg_dump.exe',
        'C:\\Program Files (x86)\\PostgreSQL\\15\\bin\\pg_dump.exe',
        'C:\\Program Files (x86)\\PostgreSQL\\14\\bin\\pg_dump.exe',
        'C:\\Program Files (x86)\\PostgreSQL\\13\\bin\\pg_dump.exe',
        'C:\\Program Files (x86)\\PostgreSQL\\12\\bin\\pg_dump.exe',
      ];

      // If not in PATH, try common installation paths
      for (const pgDumpPath of commonPaths) {
        if (fs.existsSync(pgDumpPath)) {
          this.logger.debug(`Found pg_dump at: ${pgDumpPath}`);
          return pgDumpPath;
        }
      }

      // Try to find PostgreSQL installation directory dynamically
      const programFilesPaths = [
        'C:\\Program Files\\PostgreSQL',
        'C:\\Program Files (x86)\\PostgreSQL',
      ];

      for (const basePath of programFilesPaths) {
        if (fs.existsSync(basePath)) {
          try {
            const versions = fs.readdirSync(basePath);
            // Sort versions in descending order (newest first)
            const sortedVersions = versions
              .filter(v => /^\d+$/.test(v))
              .map(v => parseInt(v, 10))
              .sort((a, b) => b - a);

            for (const version of sortedVersions) {
              const pgDumpPath = path.join(basePath, version.toString(), 'bin', 'pg_dump.exe');
              if (fs.existsSync(pgDumpPath)) {
                this.logger.debug(`Found pg_dump at: ${pgDumpPath}`);
                return pgDumpPath;
              }
            }
          } catch (error) {
            // Ignore errors when reading directory
          }
        }
      }
    }

    // On macOS, try Homebrew and common installation paths
    if (isMac) {
      const macPaths = [
        '/usr/local/bin/pg_dump',
        '/opt/homebrew/bin/pg_dump',
        '/usr/local/opt/postgresql/bin/pg_dump',
        '/opt/homebrew/opt/postgresql/bin/pg_dump',
        '/Applications/Postgres.app/Contents/Versions/latest/bin/pg_dump',
      ];

      for (const macPath of macPaths) {
        if (fs.existsSync(macPath)) {
          this.logger.debug(`Found pg_dump at: ${macPath}`);
          return macPath;
        }
      }
    }

    // On Linux, try common installation paths
    if (isLinux) {
      const linuxPaths = [
        '/usr/bin/pg_dump',
        '/usr/local/bin/pg_dump',
        '/opt/postgresql/bin/pg_dump',
      ];

      for (const linuxPath of linuxPaths) {
        if (fs.existsSync(linuxPath)) {
          this.logger.debug(`Found pg_dump at: ${linuxPath}`);
          return linuxPath;
        }
      }
    }

    // If not found, return 'pg_dump' anyway (will fail with a clearer error message)
    return 'pg_dump';
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

      // Try to use pg_dump first, fallback to TypeORM-based backup if not available
      const pgDumpCmd = this.pgDumpPath || await this.getPgDumpCommand();
      const isAvailable = this.pgDumpVerified || await this.verifyPgDump(pgDumpCmd);
      
      if (!isAvailable) {
        // Re-verify if not already verified
        const reVerified = await this.verifyPgDump(pgDumpCmd);
        if (!reVerified) {
          // Use TypeORM-based backup as fallback (no external tools required)
          this.logger.log('pg_dump not available, using TypeORM-based backup (no external tools required)');
          await this.backupDatabaseWithTypeORM(filePath);
        } else {
          // Update cached values if verification succeeded
          this.pgDumpPath = pgDumpCmd;
          this.pgDumpVerified = true;
          
          // Build pg_dump command
          const env = {
            ...process.env,
            PGPASSWORD: dbConfig.password,
          };

          let pgDumpCommand = `"${pgDumpCmd}" -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} -F c -f "${filePath}"`;

          if (dbConfig.requiresSsl) {
            pgDumpCommand += ' --no-password';
          }

          // Execute pg_dump
          await execAsync(pgDumpCommand, { env, maxBuffer: 10 * 1024 * 1024 });
        }
      } else {
        // pg_dump is available, use it
        const env = {
          ...process.env,
          PGPASSWORD: dbConfig.password,
        };

        let pgDumpCommand = `"${pgDumpCmd}" -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} -F c -f "${filePath}"`;

        if (dbConfig.requiresSsl) {
          pgDumpCommand += ' --no-password';
        }

        // Execute pg_dump
        await execAsync(pgDumpCommand, { env, maxBuffer: 10 * 1024 * 1024 });
      }

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
      // In test environment, silently fail only when called from cron jobs (no user)
      // When called directly with a user, throw the error normally for testing
      const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined || typeof jest !== 'undefined';
      
      if (!user && isTestEnv) {
        savedBackup.status = BackupStatus.FAILED;
        savedBackup.error_message = error.message || 'Unknown error';
        savedBackup.completed_at = new Date();
        await this.backupRepository.save(savedBackup);
        // Don't log errors in test environment for cron jobs
        return savedBackup; // Return silently in test environment for cron jobs
      }

      // Check if error is due to pg_dump not being available
      const isPgDumpError = error.message && (
        error.message.includes('pg_dump') && 
        (error.message.includes('not recognized') || 
         error.message.includes('not found') ||
         error.message.includes('not available'))
      );

      // Only log errors in non-test environments or when called with a user
      if (!isTestEnv) {
        if (isPgDumpError) {
          this.logger.warn(
            `Backup skipped: pg_dump is not available. Install PostgreSQL client tools or add pg_dump to PATH.`,
          );
        } else {
          this.logger.error(`Backup failed: ${error.message}`, error.stack);
        }
      }

      savedBackup.status = BackupStatus.FAILED;
      savedBackup.error_message = isPgDumpError 
        ? 'pg_dump is not available. Please install PostgreSQL client tools or add pg_dump to your PATH.'
        : (error.message || 'Unknown error');
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

      // For pg_dump errors when called from cron (no user), don't throw
      // This allows the system to continue running even if backups can't be created
      if (isPgDumpError && !user) {
        return savedBackup;
      }

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

      // Try to use pg_dump first, fallback to TypeORM-based backup if not available
      const pgDumpCmd = this.pgDumpPath || await this.getPgDumpCommand();
      const isAvailable = this.pgDumpVerified || await this.verifyPgDump(pgDumpCmd);
      
      if (!isAvailable) {
        // Re-verify if not already verified
        const reVerified = await this.verifyPgDump(pgDumpCmd);
        if (!reVerified) {
          // Use TypeORM-based backup as fallback (no external tools required)
          this.logger.log('pg_dump not available, using TypeORM-based backup (no external tools required)');
          await this.backupDatabaseWithTypeORM(filePath);
        } else {
          // Update cached values if verification succeeded
          this.pgDumpPath = pgDumpCmd;
          this.pgDumpVerified = true;
          
          // For incremental backup, we'll use pg_basebackup or WAL archiving
          // For simplicity, we'll create a dump of only changed tables
          // In production, this should use WAL archiving or pg_basebackup

          const env = {
            ...process.env,
            PGPASSWORD: dbConfig.password,
          };

          // For now, incremental backup is the same as full backup
          // In production, this should use WAL archiving
          let pgDumpCommand = `"${pgDumpCmd}" -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} -F c -f "${filePath}"`;

          if (dbConfig.requiresSsl) {
            pgDumpCommand += ' --no-password';
          }

          await execAsync(pgDumpCommand, { env, maxBuffer: 10 * 1024 * 1024 });
        }
      } else {
        // pg_dump is available, use it
        const env = {
          ...process.env,
          PGPASSWORD: dbConfig.password,
        };

        // For now, incremental backup is the same as full backup
        // In production, this should use WAL archiving
        let pgDumpCommand = `"${pgDumpCmd}" -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} -F c -f "${filePath}"`;

        if (dbConfig.requiresSsl) {
          pgDumpCommand += ' --no-password';
        }

        await execAsync(pgDumpCommand, { env, maxBuffer: 10 * 1024 * 1024 });
      }

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
      // In test environment, silently fail only when called from cron jobs (no user)
      // When called directly with a user, throw the error normally for testing
      const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined || typeof jest !== 'undefined';
      
      if (!user && isTestEnv) {
        savedBackup.status = BackupStatus.FAILED;
        savedBackup.error_message = error.message || 'Unknown error';
        savedBackup.completed_at = new Date();
        await this.backupRepository.save(savedBackup);
        // Don't log errors in test environment for cron jobs
        return savedBackup; // Return silently in test environment for cron jobs
      }

      // Check if error is due to pg_dump not being available
      const isPgDumpError = error.message && (
        error.message.includes('pg_dump') && 
        (error.message.includes('not recognized') || 
         error.message.includes('not found') ||
         error.message.includes('not available'))
      );

      // Only log errors in non-test environments or when called with a user
      if (!isTestEnv) {
        if (isPgDumpError) {
          this.logger.warn(
            `Incremental backup skipped: pg_dump is not available. Install PostgreSQL client tools or add pg_dump to PATH.`,
          );
        } else {
          this.logger.error(`Incremental backup failed: ${error.message}`, error.stack);
        }
      }

      savedBackup.status = BackupStatus.FAILED;
      savedBackup.error_message = isPgDumpError 
        ? 'pg_dump is not available. Please install PostgreSQL client tools or add pg_dump to your PATH.'
        : (error.message || 'Unknown error');
      savedBackup.completed_at = new Date();

      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkError) {
          this.logger.warn('Failed to delete failed backup file:', unlinkError);
        }
      }

      await this.backupRepository.save(savedBackup);

      // For pg_dump errors when called from cron (no user), don't throw
      // This allows the system to continue running even if backups can't be created
      if (isPgDumpError && !user) {
        return savedBackup;
      }

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
    // Skip backups in test environment
    if (
      process.env.NODE_ENV === 'test' ||
      process.env.JEST_WORKER_ID !== undefined ||
      typeof jest !== 'undefined'
    ) {
      return;
    }

    // Check if pg_dump is available, but don't skip - use TypeORM fallback instead
    const pgDumpCmd = this.pgDumpPath || await this.getPgDumpCommand();
    const isAvailable = this.pgDumpVerified || await this.verifyPgDump(pgDumpCmd);
    
    if (!isAvailable) {
      // Try to re-verify one more time
      const reVerified = await this.verifyPgDump(pgDumpCmd);
      if (!reVerified) {
        this.logger.log(
          'ℹ️ pg_dump not available, scheduled backup will use TypeORM-based method (no external tools required)',
        );
      } else {
        // Update cached values if verification succeeded
        this.pgDumpPath = pgDumpCmd;
        this.pgDumpVerified = true;
      }
    }

    this.logger.log('=== Scheduled daily full backup starting ===');
    
    try {
      const backup = await this.backupDatabase();
      this.logger.log(
        `✅ Daily full backup completed successfully: ${backup.id} (${backup.file_size} bytes)`,
      );
    } catch (error) {
      // Check if it's a pg_dump availability error
      const isPgDumpError = error.message && (
        error.message.includes('pg_dump') && 
        (error.message.includes('not recognized') || 
         error.message.includes('not found') ||
         error.message.includes('not available'))
      );
      
      if (isPgDumpError) {
        this.logger.warn(
          `⚠️ Daily full backup skipped: ${error.message}`,
        );
      } else {
        this.logger.error(
          `❌ Daily full backup failed: ${error.message}`,
          error.stack,
        );
      }
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
    // Skip backups in test environment
    if (
      process.env.NODE_ENV === 'test' ||
      process.env.JEST_WORKER_ID !== undefined ||
      typeof jest !== 'undefined'
    ) {
      return;
    }

    // Check if pg_dump is available, but don't skip - use TypeORM fallback instead
    const pgDumpCmd = this.pgDumpPath || await this.getPgDumpCommand();
    const isAvailable = this.pgDumpVerified || await this.verifyPgDump(pgDumpCmd);
    
    if (!isAvailable) {
      // Try to re-verify one more time
      const reVerified = await this.verifyPgDump(pgDumpCmd);
      if (!reVerified) {
        this.logger.log(
          'ℹ️ pg_dump not available, scheduled incremental backup will use TypeORM-based method (no external tools required)',
        );
      } else {
        // Update cached values if verification succeeded
        this.pgDumpPath = pgDumpCmd;
        this.pgDumpVerified = true;
      }
    }

    this.logger.log('=== Scheduled incremental backup starting ===');
    
    try {
      const backup = await this.backupIncremental();
      this.logger.log(
        `✅ Incremental backup completed successfully: ${backup.id} (${backup.file_size} bytes)`,
      );
    } catch (error) {
      // Check if it's a pg_dump availability error
      const isPgDumpError = error.message && (
        error.message.includes('pg_dump') && 
        (error.message.includes('not recognized') || 
         error.message.includes('not found') ||
         error.message.includes('not available'))
      );
      
      if (isPgDumpError) {
        this.logger.warn(
          `⚠️ Incremental backup skipped: ${error.message}`,
        );
      } else {
        this.logger.error(
          `❌ Incremental backup failed: ${error.message}`,
          error.stack,
        );
      }
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
    // Skip backups in test environment
    if (
      process.env.NODE_ENV === 'test' ||
      process.env.JEST_WORKER_ID !== undefined ||
      typeof jest !== 'undefined'
    ) {
      return;
    }

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

  /**
   * Create backup using TypeORM directly (no external tools required)
   * This method generates SQL dump by querying the database through TypeORM
   */
  private async backupDatabaseWithTypeORM(filePath: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const writeStream = fs.createWriteStream(filePath, { encoding: 'utf8' });
      
      try {
        // Write header
        writeStream.write(`-- PostgreSQL database backup\n`);
        writeStream.write(`-- Generated by PMD Management System (TypeORM-based, no external tools required)\n`);
        writeStream.write(`-- Date: ${new Date().toISOString()}\n`);
        writeStream.write(`-- Database: ${this.dataSource.options.database || 'unknown'}\n\n`);
        writeStream.write(`BEGIN;\n\n`);

        // Get all table names
        const tables = await this.dataSource.query(`
          SELECT tablename 
          FROM pg_tables 
          WHERE schemaname = 'public' 
          ORDER BY tablename;
        `);

        this.logger.log(`Backing up ${tables.length} tables using TypeORM...`);

        // For each table, get structure and data
        for (const table of tables) {
          const tableName = table.tablename;
          this.logger.debug(`Backing up table: ${tableName}`);

          // Get table structure using pg_dump format query
          const createTableResult = await this.dataSource.query(`
            SELECT 
              'CREATE TABLE IF NOT EXISTS ' || quote_ident($1) || ' (' ||
              string_agg(
                quote_ident(column_name) || ' ' || 
                CASE 
                  WHEN udt_name = 'uuid' THEN 'uuid'
                  WHEN udt_name = 'jsonb' THEN 'jsonb'
                  WHEN udt_name = 'json' THEN 'json'
                  WHEN data_type = 'ARRAY' THEN udt_name || '[]'
                  WHEN data_type = 'USER-DEFINED' THEN udt_name
                  WHEN data_type = 'character varying' THEN 'varchar'
                  WHEN data_type = 'character' THEN 'char'
                  WHEN data_type = 'timestamp without time zone' THEN 'timestamp'
                  WHEN data_type = 'timestamp with time zone' THEN 'timestamptz'
                  ELSE data_type
                END ||
                CASE 
                  WHEN character_maximum_length IS NOT NULL 
                  THEN '(' || character_maximum_length || ')'
                  ELSE ''
                END ||
                CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
                CASE 
                  WHEN column_default IS NOT NULL AND column_default NOT LIKE 'nextval%'
                  THEN ' DEFAULT ' || column_default
                  ELSE ''
                END,
                ', '
              ) || ');' as create_statement
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = $1
            GROUP BY table_name;
          `, [tableName]);

          if (createTableResult.length > 0 && createTableResult[0].create_statement) {
            writeStream.write(`-- Table: ${tableName}\n`);
            writeStream.write(`${createTableResult[0].create_statement}\n\n`);
          }

          // Get table data
          const rows = await this.dataSource.query(
            `SELECT * FROM ${this.dataSource.driver.escape(tableName)}`
          );
          
          if (rows.length > 0) {
            // Get column names
            const columns = Object.keys(rows[0]);
            
            // Generate INSERT statements in batches
            const batchSize = 50;
            for (let i = 0; i < rows.length; i += batchSize) {
              const batch = rows.slice(i, i + batchSize);
              const values = batch.map(row => {
                const rowValues = columns.map(col => {
                  const value = row[col];
                  if (value === null || value === undefined) return 'NULL';
                  
                  if (typeof value === 'string') {
                    // Escape single quotes and wrap in quotes
                    return `'${value.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
                  }
                  
                  if (value instanceof Date) {
                    return `'${value.toISOString()}'`;
                  }
                  
                  if (typeof value === 'boolean') {
                    return value ? 'TRUE' : 'FALSE';
                  }
                  
                  if (Buffer.isBuffer(value)) {
                    return `'\\\\x${value.toString('hex')}'`;
                  }
                  
                  if (Array.isArray(value)) {
                    const arrayStr = JSON.stringify(value).replace(/'/g, "''");
                    return `'${arrayStr}'::jsonb`;
                  }
                  
                  if (typeof value === 'object') {
                    const objStr = JSON.stringify(value).replace(/'/g, "''");
                    return `'${objStr}'::jsonb`;
                  }
                  
                  return String(value);
                });
                return `(${rowValues.join(', ')})`;
              });

              const columnList = columns.map(col => this.dataSource.driver.escape(col)).join(', ');
              writeStream.write(`INSERT INTO ${this.dataSource.driver.escape(tableName)} (${columnList}) VALUES\n`);
              writeStream.write(`${values.join(',\n')};\n\n`);
            }
            
            this.logger.debug(`  ✓ ${rows.length} rows backed up from ${tableName}`);
          } else {
            this.logger.debug(`  ✓ ${tableName} is empty`);
          }
        }

        writeStream.write(`COMMIT;\n`);
        writeStream.end();

        // Wait for stream to finish
        writeStream.on('finish', () => {
          this.logger.log(`TypeORM-based backup completed: ${filePath}`);
          resolve();
        });
        
        writeStream.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        writeStream.destroy();
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        reject(error);
      }
    });
  }

  /**
   * Get diagnostic information about pg_dump availability
   */
  async getDiagnostics(): Promise<{
    pgDumpAvailable: boolean;
    pgDumpPath: string | null;
    pgDumpVerified: boolean;
    platform: string;
    envPgDumpPath: string | undefined;
    checkedPaths: string[];
    suggestions: string[];
  }> {
    const isWindows = process.platform === 'win32';
    const isMac = process.platform === 'darwin';
    const isLinux = process.platform === 'linux';
    
    const envPgDumpPath = this.configService.get<string>('PG_DUMP_PATH');
    const checkedPaths: string[] = [];
    const suggestions: string[] = [];

    // Check environment variable
    if (envPgDumpPath) {
      checkedPaths.push(`PG_DUMP_PATH=${envPgDumpPath} (${fs.existsSync(envPgDumpPath) ? '✅ exists' : '❌ not found'})`);
    } else {
      checkedPaths.push('PG_DUMP_PATH not set');
      suggestions.push('Set PG_DUMP_PATH environment variable to point to pg_dump executable');
    }

    // Platform-specific paths
    if (isWindows) {
      checkedPaths.push('Windows PATH (checked)');
      const commonPaths = [
        'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe',
        'C:\\Program Files (x86)\\PostgreSQL\\15\\bin\\pg_dump.exe',
      ];
      
      for (const pgPath of commonPaths) {
        const exists = fs.existsSync(pgPath);
        checkedPaths.push(`${pgPath} (${exists ? '✅ exists' : '❌ not found'})`);
      }

      suggestions.push('Install PostgreSQL from https://www.postgresql.org/download/windows/');
      suggestions.push('During installation, check "Add PostgreSQL bin directory to PATH"');
      suggestions.push('Or manually add PostgreSQL bin directory to Windows PATH');
    } else if (isMac) {
      checkedPaths.push('macOS PATH (checked)');
      const macPaths = [
        '/usr/local/bin/pg_dump',
        '/opt/homebrew/bin/pg_dump',
        '/Applications/Postgres.app/Contents/Versions/latest/bin/pg_dump',
      ];
      
      for (const macPath of macPaths) {
        const exists = fs.existsSync(macPath);
        checkedPaths.push(`${macPath} (${exists ? '✅ exists' : '❌ not found'})`);
      }

      suggestions.push('Install PostgreSQL via Homebrew: brew install postgresql');
      suggestions.push('Or download from https://www.postgresql.org/download/macosx/');
    } else if (isLinux) {
      checkedPaths.push('Linux PATH (checked)');
      const linuxPaths = [
        '/usr/bin/pg_dump',
        '/usr/local/bin/pg_dump',
        '/opt/postgresql/bin/pg_dump',
      ];
      
      for (const linuxPath of linuxPaths) {
        const exists = fs.existsSync(linuxPath);
        checkedPaths.push(`${linuxPath} (${exists ? '✅ exists' : '❌ not found'})`);
      }

      suggestions.push('Install PostgreSQL client: sudo apt-get install postgresql-client (Debian/Ubuntu)');
      suggestions.push('Or: sudo yum install postgresql (RHEL/CentOS)');
    }

    // Try to get current pg_dump command
    let currentPgDumpPath: string | null = null;
    try {
      currentPgDumpPath = this.pgDumpPath || await this.getPgDumpCommand();
    } catch (error) {
      // Ignore errors
    }

    return {
      pgDumpAvailable: this.pgDumpVerified,
      pgDumpPath: this.pgDumpPath || currentPgDumpPath,
      pgDumpVerified: this.pgDumpVerified,
      platform: process.platform,
      envPgDumpPath,
      checkedPaths,
      suggestions,
    };
  }
}

