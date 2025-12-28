import { Injectable, NotFoundException, ForbiddenException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule } from './schedule.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { ScheduleState } from '../common/enums/schedule-state.enum';
import { User } from '../users/user.entity';
import { Work } from '../works/works.entity';
import { WorksService } from '../works/works.service';

// Predefined stages for automatic Gantt generation
export interface PredefinedStage {
  name: string;
  description?: string;
  durationPercentage: number; // Percentage of total work duration
  order: number;
}

// Default predefined stages (can be customized per work type)
const DEFAULT_STAGES: PredefinedStage[] = [
  { name: 'Preparación y Planificación', description: 'Preparación del terreno, permisos y planificación', durationPercentage: 10, order: 1 },
  { name: 'Excavación y Fundaciones', description: 'Excavación, fundaciones y estructura base', durationPercentage: 15, order: 2 },
  { name: 'Estructura', description: 'Construcción de estructura principal', durationPercentage: 20, order: 3 },
  { name: 'Instalaciones', description: 'Instalaciones eléctricas, plomería y sanitarias', durationPercentage: 15, order: 4 },
  { name: 'Cerramientos', description: 'Muros, techos y cerramientos exteriores', durationPercentage: 12, order: 5 },
  { name: 'Terminaciones Interiores', description: 'Revoques, pintura, pisos y terminaciones', durationPercentage: 15, order: 6 },
  { name: 'Instalaciones Finales', description: 'Carpintería, herrería y acabados', durationPercentage: 8, order: 7 },
  { name: 'Limpieza y Entrega', description: 'Limpieza final, inspecciones y entrega', durationPercentage: 5, order: 8 },
];

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
    @InjectRepository(Work)
    private workRepository: Repository<Work>,
    @Inject(forwardRef(() => WorksService))
    private worksService: WorksService,
  ) {}

  async create(createScheduleDto: CreateScheduleDto, user: User): Promise<Schedule> {
    const schedule = this.scheduleRepository.create(createScheduleDto);
    return await this.scheduleRepository.save(schedule);
  }

  async findAll(user: User): Promise<Schedule[]> {
    try {
      return await this.scheduleRepository.find({
        relations: ['work'],
        order: { order: 'ASC', start_date: 'ASC' },
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[ScheduleService.findAll] Error:', error);
      }
      return [];
    }
  }

  async findOne(id: string, user: User): Promise<Schedule> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id },
      relations: ['work'],
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${id} not found`);
    }

    return schedule;
  }

  async update(id: string, updateScheduleDto: UpdateScheduleDto, user: User): Promise<Schedule> {
    const schedule = await this.findOne(id, user);

    // Only Direction can edit structure, Supervisor can mark as completed
    if (
      updateScheduleDto.state === ScheduleState.COMPLETED &&
      user.role.name !== UserRole.SUPERVISOR &&
      user.role.name !== UserRole.DIRECTION
    ) {
      throw new ForbiddenException('Only Supervisor and Direction can mark stages as completed');
    }

    // Only Direction can edit structure (other fields)
    if (
      Object.keys(updateScheduleDto).some(
        (key) => key !== 'state' && key !== 'actual_end_date',
      ) &&
      user.role.name !== UserRole.DIRECTION
    ) {
      throw new ForbiddenException('Only Direction can edit schedule structure');
    }

    Object.assign(schedule, updateScheduleDto);
    const updatedSchedule = await this.scheduleRepository.save(schedule);

    // If stage was marked as completed, update work progress
    if (updateScheduleDto.state === ScheduleState.COMPLETED && schedule.work_id) {
      try {
        await this.worksService.updateAllProgress(schedule.work_id);
        this.logger.log(`Stage ${schedule.id} marked as completed. Work progress updated.`);
      } catch (error) {
        this.logger.error(`Error updating work progress after stage completion: ${error.message}`);
      }
    }

    return updatedSchedule;
  }

  async remove(id: string, user: User): Promise<void> {
    // Only Direction can delete schedules
    if (user.role.name !== UserRole.DIRECTION) {
      throw new ForbiddenException('Only Direction can delete schedules');
    }

    const schedule = await this.findOne(id, user);
    await this.scheduleRepository.remove(schedule);
  }

  /**
   * Generate automatic Gantt chart for a work
   * Creates predefined stages with proportional durations
   */
  async generateAutomaticGantt(workId: string, user: User, customStages?: PredefinedStage[]): Promise<Schedule[]> {
    // Only Direction can generate Gantt
    if (user.role.name !== UserRole.DIRECTION) {
      throw new ForbiddenException('Only Direction can generate Gantt charts');
    }

    const work = await this.workRepository.findOne({
      where: { id: workId },
    });

    if (!work) {
      throw new NotFoundException(`Work with ID ${workId} not found`);
    }

    // Check if schedules already exist
    const existingSchedules = await this.scheduleRepository.find({
      where: { work_id: workId },
    });

    if (existingSchedules.length > 0) {
      throw new ForbiddenException('Work already has schedules. Delete existing schedules first or use regenerate.');
    }

    // Use custom stages if provided, otherwise use default
    const stages = customStages || DEFAULT_STAGES;

    // Calculate total work duration in days
    const workStartDate = new Date(work.start_date);
    const workEndDate = work.end_date ? new Date(work.end_date) : this.calculateEstimatedEndDate(workStartDate);
    const totalDays = Math.ceil((workEndDate.getTime() - workStartDate.getTime()) / (1000 * 60 * 60 * 24));

    if (totalDays <= 0) {
      throw new ForbiddenException('Work end date must be after start date');
    }

    // Generate schedules for each stage
    const schedules: Schedule[] = [];
    let currentDate = new Date(workStartDate);

    for (const stage of stages) {
      const stageDuration = Math.ceil((totalDays * stage.durationPercentage) / 100);
      const stageEndDate = new Date(currentDate);
      stageEndDate.setDate(stageEndDate.getDate() + stageDuration - 1);

      const schedule = this.scheduleRepository.create({
        work_id: workId,
        stage_name: stage.name,
        description: stage.description,
        start_date: new Date(currentDate),
        end_date: stageEndDate,
        state: ScheduleState.PENDING,
        order: stage.order,
      });

      schedules.push(schedule);
      currentDate = new Date(stageEndDate);
      currentDate.setDate(currentDate.getDate() + 1); // Start next stage the day after previous ends
    }

    // Save all schedules
    return await this.scheduleRepository.save(schedules);
  }

  /**
   * Regenerate Gantt chart for a work (deletes existing and creates new)
   */
  async regenerateGantt(workId: string, user: User, customStages?: PredefinedStage[]): Promise<Schedule[]> {
    // Only Direction can regenerate Gantt
    if (user.role.name !== UserRole.DIRECTION) {
      throw new ForbiddenException('Only Direction can regenerate Gantt charts');
    }

    // Delete existing schedules
    const existingSchedules = await this.scheduleRepository.find({
      where: { work_id: workId },
    });

    if (existingSchedules.length > 0) {
      await this.scheduleRepository.remove(existingSchedules);
    }

    // Generate new schedules
    return await this.generateAutomaticGantt(workId, user, customStages);
  }

  /**
   * Get schedules for a work
   */
  async findByWorkId(workId: string, user: User): Promise<Schedule[]> {
    const work = await this.workRepository.findOne({
      where: { id: workId },
    });

    if (!work) {
      throw new NotFoundException(`Work with ID ${workId} not found`);
    }

    return await this.scheduleRepository.find({
      where: { work_id: workId },
      order: { order: 'ASC', start_date: 'ASC' },
    });
  }

  /**
   * Calculate estimated end date if not provided
   * Default: 12 months from start date
   */
  private calculateEstimatedEndDate(startDate: Date): Date {
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 12);
    return endDate;
  }

  /**
   * Get predefined stages (can be customized per work type)
   */
  getPredefinedStages(workType?: string): PredefinedStage[] {
    // In the future, this could return different stages based on work type
    // For now, return default stages
    return DEFAULT_STAGES;
  }
}

