import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Attendance } from './attendance.entity';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';
import { User } from '../users/user.entity';
import { AttendanceStatus } from '../common/enums/attendance-status.enum';
import { getOrganizationId } from '../common/helpers/get-organization-id.helper';

/**
 * Calculate the Monday (week start date) for a given date
 */
function getWeekStartDate(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
  ) {}

  /**
   * Find all attendance records with filters
   */
  async findAll(
    user: User,
    filters?: {
      filterByOrganization?: boolean;
      week_start_date?: string;
      employee_id?: string;
      work_id?: string;
    },
  ): Promise<Attendance[]> {
    try {
      const organizationId = getOrganizationId(user);
      const qb = this.attendanceRepository
        .createQueryBuilder('attendance')
        .leftJoinAndSelect('attendance.employee', 'employee')
        .orderBy('attendance.date', 'DESC')
        .addOrderBy('attendance.created_at', 'DESC');

      if (filters?.filterByOrganization === true && organizationId) {
        qb.andWhere('attendance.organization_id = :organizationId', {
          organizationId,
        });
      }

      if (filters?.week_start_date) {
        qb.andWhere('attendance.week_start_date = :week_start_date', {
          week_start_date: filters.week_start_date,
        });
      }

      if (filters?.employee_id) {
        qb.andWhere('attendance.employee_id = :employee_id', {
          employee_id: filters.employee_id,
        });
      }

      if (filters?.work_id) {
        qb.andWhere('employee.work_id = :work_id', {
          work_id: filters.work_id,
        });
      }

      return await qb.getMany();
    } catch (error) {
      this.logger.error('Error fetching attendance', error);
      return [];
    }
  }

  /**
   * Get weekly attendance sheet (all employees for a week)
   */
  async getWeeklyAttendance(weekStartDate: string, user: User): Promise<Attendance[]> {
    const organizationId = getOrganizationId(user);
    const qb = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.employee', 'employee')
      .where('attendance.week_start_date = :week_start_date', {
        week_start_date: weekStartDate,
      })
      .orderBy('attendance.date', 'ASC');

    if (organizationId) {
      qb.andWhere('attendance.organization_id = :organizationId', {
        organizationId,
      });
    }

    return await qb.getMany();
  }

  /**
   * Find one attendance record
   */
  async findOne(id: string, user: User): Promise<Attendance> {
    const attendance = await this.attendanceRepository.findOne({
      where: { id },
      relations: ['employee', 'organization'],
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance with ID ${id} not found`);
    }

    const organizationId = getOrganizationId(user);
    if (
      organizationId &&
      attendance.organization_id &&
      attendance.organization_id !== organizationId
    ) {
      throw new BadRequestException(
        'La asistencia no pertenece a tu organización',
      );
    }

    return attendance;
  }

  /**
   * Create attendance record
   * Automatically calculates week_start_date from date
   */
  async create(createAttendanceDto: CreateAttendanceDto, user: User): Promise<Attendance> {
    const date = new Date(createAttendanceDto.date);
    const weekStartDate = getWeekStartDate(date);

    // Validate late_hours only if status is LATE
    if (
      createAttendanceDto.status === AttendanceStatus.LATE &&
      (!createAttendanceDto.late_hours || createAttendanceDto.late_hours <= 0)
    ) {
      throw new BadRequestException(
        'Las horas de tardanza son requeridas cuando el estado es LATE',
      );
    }

    // Clear late_hours if status is not LATE
    const lateHours =
      createAttendanceDto.status === AttendanceStatus.LATE
        ? createAttendanceDto.late_hours || null
        : null;

    const organizationId = getOrganizationId(user);
    const attendance = this.attendanceRepository.create({
      employee_id: createAttendanceDto.employee_id,
      date,
      status: createAttendanceDto.status || AttendanceStatus.PRESENT,
      late_hours: lateHours,
      week_start_date: weekStartDate,
      organization_id: organizationId,
    });

    return await this.attendanceRepository.save(attendance);
  }

  /**
   * Update attendance record
   */
  async update(
    id: string,
    updateAttendanceDto: UpdateAttendanceDto,
    user: User,
  ): Promise<Attendance> {
    const attendance = await this.findOne(id, user);

    if (updateAttendanceDto.date) {
      const date = new Date(updateAttendanceDto.date);
      attendance.date = date;
      attendance.week_start_date = getWeekStartDate(date);
    }

    if (updateAttendanceDto.status !== undefined) {
      attendance.status = updateAttendanceDto.status;

      // Validate late_hours if status is LATE
      if (
        updateAttendanceDto.status === AttendanceStatus.LATE &&
        (!updateAttendanceDto.late_hours || updateAttendanceDto.late_hours <= 0)
      ) {
        throw new BadRequestException(
          'Las horas de tardanza son requeridas cuando el estado es LATE',
        );
      }

      // Clear late_hours if status is not LATE
      if (updateAttendanceDto.status !== AttendanceStatus.LATE) {
        attendance.late_hours = null;
      } else if (updateAttendanceDto.late_hours !== undefined) {
        attendance.late_hours = updateAttendanceDto.late_hours;
      }
    } else if (updateAttendanceDto.late_hours !== undefined) {
      // Only update late_hours if status is LATE
      if (attendance.status === AttendanceStatus.LATE) {
        attendance.late_hours = updateAttendanceDto.late_hours;
      } else {
        throw new BadRequestException(
          'Las horas de tardanza solo pueden asignarse cuando el estado es LATE',
        );
      }
    }

    return await this.attendanceRepository.save(attendance);
  }

  /**
   * Delete attendance record
   */
  async remove(id: string, user: User): Promise<void> {
    const attendance = await this.findOne(id, user);
    await this.attendanceRepository.remove(attendance);
  }

  /**
   * Bulk create attendance records
   */
  async bulkCreate(bulkDto: BulkAttendanceDto, user: User): Promise<Attendance[]> {
    const organizationId = getOrganizationId(user);
    const weekStartDate = new Date(bulkDto.week_start_date);

    const attendances = bulkDto.attendances.map((attendanceDto) => {
      const date = new Date(attendanceDto.date);
      const calculatedWeekStart = getWeekStartDate(date);

      // Validate that all dates belong to the same week
      if (
        calculatedWeekStart.toISOString().split('T')[0] !==
        weekStartDate.toISOString().split('T')[0]
      ) {
        throw new BadRequestException(
          `La fecha ${attendanceDto.date} no pertenece a la semana ${bulkDto.week_start_date}`,
        );
      }

      // Validate late_hours
      const lateHours =
        attendanceDto.status === AttendanceStatus.LATE
          ? attendanceDto.late_hours || null
          : null;

      if (
        attendanceDto.status === AttendanceStatus.LATE &&
        (!attendanceDto.late_hours || attendanceDto.late_hours <= 0)
      ) {
        throw new BadRequestException(
          `Las horas de tardanza son requeridas para el empleado ${attendanceDto.employee_id} con estado LATE`,
        );
      }

      return this.attendanceRepository.create({
        employee_id: attendanceDto.employee_id,
        date,
        status: attendanceDto.status || AttendanceStatus.PRESENT,
        late_hours: lateHours,
        week_start_date: weekStartDate,
        organization_id: organizationId,
      });
    });

    return await this.attendanceRepository.save(attendances);
  }
}
