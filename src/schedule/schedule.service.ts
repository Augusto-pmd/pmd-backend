import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule } from './schedule.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { ScheduleState } from '../common/enums/schedule-state.enum';
import { User } from '../users/users.entity';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
  ) {}

  async create(createScheduleDto: CreateScheduleDto, user: User): Promise<Schedule> {
    const schedule = this.scheduleRepository.create(createScheduleDto);
    return await this.scheduleRepository.save(schedule);
  }

  async findAll(user: User): Promise<Schedule[]> {
    return await this.scheduleRepository.find({
      relations: ['work'],
      order: { order: 'ASC', start_date: 'ASC' },
    });
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
    return await this.scheduleRepository.save(schedule);
  }

  async remove(id: string, user: User): Promise<void> {
    // Only Direction can delete schedules
    if (user.role.name !== UserRole.DIRECTION) {
      throw new ForbiddenException('Only Direction can delete schedules');
    }

    const schedule = await this.findOne(id, user);
    await this.scheduleRepository.remove(schedule);
  }
}

