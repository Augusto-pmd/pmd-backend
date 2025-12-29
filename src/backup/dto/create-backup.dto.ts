import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BackupType } from '../backup.entity';

export class CreateBackupDto {
  @ApiProperty({
    description: 'Type of backup to create',
    enum: BackupType,
    example: BackupType.FULL,
  })
  @IsEnum(BackupType)
  type: BackupType;
}

export class CleanupBackupsDto {
  @ApiPropertyOptional({
    description: 'Number of days to keep backups (default: 30)',
    example: 30,
    minimum: 1,
    default: 30,
  })
  @IsOptional()
  daysToKeep?: number;
}

