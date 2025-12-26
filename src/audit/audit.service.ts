import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { UpdateAuditLogDto } from './dto/update-audit-log.dto';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async create(createAuditLogDto: CreateAuditLogDto): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create(createAuditLogDto);
    return await this.auditLogRepository.save(auditLog);
  }

  async findAll(page: number = 1, limit: number = 50): Promise<{ data: AuditLog[]; total: number; page: number; limit: number }> {
    try {
      const skip = (page - 1) * limit;
      
      // Use QueryBuilder to load relations efficiently and get total count
      const queryBuilder = this.auditLogRepository
        .createQueryBuilder('audit')
        .leftJoinAndSelect('audit.user', 'user')
        .orderBy('audit.created_at', 'DESC')
        .skip(skip)
        .take(limit);

      const [data, total] = await queryBuilder.getManyAndCount();

      return {
        data,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error('Error fetching audit logs', error);
      return {
        data: [],
        total: 0,
        page,
        limit,
      };
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

  async findByModule(module: string, page: number = 1, limit: number = 50): Promise<{ data: AuditLog[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user')
      .where('audit.module = :module', { module })
      .orderBy('audit.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findByUser(userId: string, page: number = 1, limit: number = 50): Promise<{ data: AuditLog[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user')
      .where('audit.user_id = :userId', { userId })
      .orderBy('audit.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
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


