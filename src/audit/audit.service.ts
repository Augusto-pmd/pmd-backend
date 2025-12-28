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

  /**
   * Log authentication events (login, logout, failed attempts)
   * This method is used by AuthService to record authentication-specific events
   */
  async logAuthEvent(
    action: 'login' | 'logout' | 'login_failed',
    userId: string | null,
    ipAddress: string,
    userAgent: string,
    deviceInfo?: Record<string, any>,
    metadata?: Record<string, any>,
  ): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      user_id: userId,
      action,
      module: 'auth',
      entity_id: userId,
      entity_type: 'user',
      previous_value: action === 'login' ? { status: 'logged_out' } : null,
      new_value: action === 'login' ? { status: 'logged_in', timestamp: new Date().toISOString() } : 
                 action === 'logout' ? { status: 'logged_out', timestamp: new Date().toISOString() } :
                 { status: 'login_failed', timestamp: new Date().toISOString(), ...metadata },
      ip_address: ipAddress,
      user_agent: userAgent,
      device_info: deviceInfo || this.extractDeviceInfo(userAgent),
      criticality: action === 'login_failed' ? 'medium' : 'high',
      metadata: metadata || {},
    });

    return await this.auditLogRepository.save(auditLog);
  }

  /**
   * Extract device information from user agent string
   */
  private extractDeviceInfo(userAgent: string): Record<string, any> {
    const info: Record<string, any> = {
      user_agent: userAgent,
    };

    // Extract browser
    if (userAgent.includes('Chrome')) info.browser = 'Chrome';
    else if (userAgent.includes('Firefox')) info.browser = 'Firefox';
    else if (userAgent.includes('Safari')) info.browser = 'Safari';
    else if (userAgent.includes('Edge')) info.browser = 'Edge';
    else info.browser = 'Unknown';

    // Extract OS
    if (userAgent.includes('Windows')) info.os = 'Windows';
    else if (userAgent.includes('Mac')) info.os = 'macOS';
    else if (userAgent.includes('Linux')) info.os = 'Linux';
    else if (userAgent.includes('Android')) info.os = 'Android';
    else if (userAgent.includes('iOS')) info.os = 'iOS';
    else info.os = 'Unknown';

    // Extract device type
    if (userAgent.includes('Mobile')) info.device_type = 'Mobile';
    else if (userAgent.includes('Tablet')) info.device_type = 'Tablet';
    else info.device_type = 'Desktop';

    return info;
  }

  /**
   * Find audit logs by action type (e.g., 'login', 'logout', 'login_failed')
   */
  async findByAction(
    action: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: AuditLog[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user')
      .where('audit.action = :action', { action })
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

  /**
   * Find audit logs by IP address
   */
  async findByIp(
    ipAddress: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: AuditLog[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user')
      .where('audit.ip_address = :ipAddress', { ipAddress })
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
}


