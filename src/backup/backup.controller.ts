import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import * as path from 'path';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { BackupService } from './backup.service';
import { CreateBackupDto, CleanupBackupsDto } from './dto/create-backup.dto';
import { BackupType } from './backup.entity';

@ApiTags('Backups')
@ApiBearerAuth('JWT-auth')
@Controller('backups')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post()
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create backup',
    description: 'Create a full or incremental database backup. Only Administration and Direction can create backups.',
  })
  @ApiBody({ type: CreateBackupDto })
  @ApiResponse({ status: 201, description: 'Backup created successfully' })
  @ApiResponse({ status: 403, description: 'Only Administration and Direction can create backups' })
  async create(@Body() createBackupDto: CreateBackupDto, @Request() req) {
    if (createBackupDto.type === BackupType.FULL) {
      return await this.backupService.backupDatabase(req.user);
    } else {
      return await this.backupService.backupIncremental(req.user);
    }
  }

  @Get()
  @Roles(
    UserRole.OPERATOR,
    UserRole.SUPERVISOR,
    UserRole.ADMINISTRATION,
    UserRole.DIRECTION,
  )
  @ApiOperation({
    summary: 'Get all backups',
    description: 'Get list of all backups',
  })
  @ApiResponse({ status: 200, description: 'List of backups' })
  async findAll() {
    return await this.backupService.findAll();
  }

  @Get('logs')
  @Roles(
    UserRole.OPERATOR,
    UserRole.SUPERVISOR,
    UserRole.ADMINISTRATION,
    UserRole.DIRECTION,
  )
  @ApiOperation({
    summary: 'Get backup logs',
    description: 'Get recent backup execution logs (last 50)',
  })
  @ApiResponse({ status: 200, description: 'List of recent backup logs' })
  async getLogs() {
    return await this.backupService.getRecentLogs(50);
  }

  @Get('status')
  @Roles(
    UserRole.OPERATOR,
    UserRole.SUPERVISOR,
    UserRole.ADMINISTRATION,
    UserRole.DIRECTION,
  )
  @ApiOperation({
    summary: 'Get backup status',
    description: 'Get status of scheduled backups and statistics',
  })
  @ApiResponse({ status: 200, description: 'Backup status and statistics' })
  async getStatus() {
    return await this.backupService.getStatus();
  }

  @Get('diagnostics')
  @Roles(
    UserRole.ADMINISTRATION,
    UserRole.DIRECTION,
  )
  @ApiOperation({
    summary: 'Get backup diagnostics',
    description: 'Get diagnostic information about pg_dump availability and configuration',
  })
  @ApiResponse({ status: 200, description: 'Backup diagnostics information' })
  async getDiagnostics() {
    return await this.backupService.getDiagnostics();
  }

  @Get(':id')
  @Roles(
    UserRole.OPERATOR,
    UserRole.SUPERVISOR,
    UserRole.ADMINISTRATION,
    UserRole.DIRECTION,
  )
  @ApiOperation({
    summary: 'Get backup by ID',
    description: 'Get details of a specific backup',
  })
  @ApiParam({ name: 'id', description: 'Backup UUID', type: String })
  @ApiResponse({ status: 200, description: 'Backup details' })
  @ApiResponse({ status: 404, description: 'Backup not found' })
  async findOne(@Param('id') id: string) {
    return await this.backupService.findOne(id);
  }

  @Get(':id/download')
  @Roles(
    UserRole.OPERATOR,
    UserRole.SUPERVISOR,
    UserRole.ADMINISTRATION,
    UserRole.DIRECTION,
  )
  @ApiOperation({
    summary: 'Download backup file',
    description: 'Download the backup file',
  })
  @ApiParam({ name: 'id', description: 'Backup UUID', type: String })
  @ApiResponse({ status: 200, description: 'Backup file download' })
  @ApiResponse({ status: 404, description: 'Backup not found' })
  async download(@Param('id') id: string, @Res() res: Response) {
    const backup = await this.backupService.findOne(id);
    const fileStream = await this.backupService.getBackupFileStream(id);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${path.basename(backup.file_path)}"`,
    );

    fileStream.pipe(res);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete backup',
    description: 'Delete a backup. Only Administration and Direction can delete backups.',
  })
  @ApiParam({ name: 'id', description: 'Backup UUID', type: String })
  @ApiResponse({ status: 204, description: 'Backup deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only Administration and Direction can delete backups' })
  @ApiResponse({ status: 404, description: 'Backup not found' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.backupService.remove(id, req.user);
  }

  @Post('cleanup')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cleanup old backups',
    description: 'Delete backups older than specified days. Only Administration and Direction can cleanup backups.',
  })
  @ApiBody({ type: CleanupBackupsDto })
  @ApiResponse({ status: 200, description: 'Number of backups deleted' })
  @ApiResponse({ status: 403, description: 'Only Administration and Direction can cleanup backups' })
  async cleanup(@Body() cleanupDto: CleanupBackupsDto, @Request() req) {
    const daysToKeep = cleanupDto.daysToKeep || 30;
    const deletedCount = await this.backupService.cleanupOldBackups(daysToKeep);
    return { deleted: deletedCount };
  }
}

