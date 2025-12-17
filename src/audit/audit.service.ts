import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { UpdateAuditLogDto } from './dto/update-audit-log.dto';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async create(createAuditLogDto: CreateAuditLogDto): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create(createAuditLogDto);
    return await this.auditLogRepository.save(auditLog);
  }

  async findAll(): Promise<AuditLog[]> {
    try {
      return await this.auditLogRepository.find({
        relations: ['user'],
        order: { created_at: 'DESC' },
        take: 1000, // Limit to prevent performance issues
      });
    } catch (error) {
      console.error('[AuditService.findAll] Error:', error);
      return [];
    }
  }

  async findOne(id: string): Promise<AuditLog> {
    const auditLog = await this.auditLogRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!auditLog) {
      throw new NotFoundException(`Audit log with ID ${id} not found`);
    }

    return auditLog;
  }

  async findByModule(module: string): Promise<AuditLog[]> {
    return await this.auditLogRepository.find({
      where: { module },
      relations: ['user'],
      order: { created_at: 'DESC' },
      take: 500,
    });
  }

  async findByUser(userId: string): Promise<AuditLog[]> {
    return await this.auditLogRepository.find({
      where: { user_id: userId },
      relations: ['user'],
      order: { created_at: 'DESC' },
      take: 500,
    });
  }

  async remove(id: string): Promise<void> {
    const auditLog = await this.findOne(id);
    await this.auditLogRepository.remove(auditLog);
  }

  async removeAll(): Promise<{ deleted: number }> {
    const result = await this.auditLogRepository.delete({});
    return { deleted: result.affected || 0 };
  }
}


