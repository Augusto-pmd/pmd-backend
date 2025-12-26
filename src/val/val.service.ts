import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Val } from './val.entity';
import { CreateValDto } from './dto/create-val.dto';
import { UpdateValDto } from './dto/update-val.dto';
import { User } from '../users/user.entity';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class ValService {
  private readonly logger = new Logger(ValService.name);

  constructor(
    @InjectRepository(Val)
    private valRepository: Repository<Val>,
  ) {}

  async create(createValDto: CreateValDto, user: User): Promise<Val> {
    // Validate permissions at service level (double check)
    if (
      user.role.name !== UserRole.ADMINISTRATION &&
      user.role.name !== UserRole.DIRECTION
    ) {
      throw new ForbiddenException('Only Administration and Direction can create VAL records');
    }

    const val = this.valRepository.create(createValDto);
    return await this.valRepository.save(val);
  }

  async findAll(user: User): Promise<Val[]> {
    try {
      // Validate permissions at service level (double check)
      if (
        user.role.name !== UserRole.ADMINISTRATION &&
        user.role.name !== UserRole.DIRECTION
      ) {
        throw new ForbiddenException('Only Administration and Direction can view VAL records');
      }

      return await this.valRepository.find({
        relations: ['expense'],
        order: { code: 'ASC' },
      });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error('Error fetching VAL records', error);
      return [];
    }
  }

  async findOne(id: string, user: User): Promise<Val> {
    // Validate permissions at service level (double check)
    if (
      user.role.name !== UserRole.ADMINISTRATION &&
      user.role.name !== UserRole.DIRECTION
    ) {
      throw new ForbiddenException('Only Administration and Direction can view VAL records');
    }

    const val = await this.valRepository.findOne({
      where: { id },
      relations: ['expense'],
    });

    if (!val) {
      throw new NotFoundException(`VAL with ID ${id} not found`);
    }

    return val;
  }

  async update(id: string, updateValDto: UpdateValDto, user: User): Promise<Val> {
    // Validate permissions at service level (double check)
    if (
      user.role.name !== UserRole.ADMINISTRATION &&
      user.role.name !== UserRole.DIRECTION
    ) {
      throw new ForbiddenException('Only Administration and Direction can update VAL records');
    }

    const val = await this.findOne(id, user);
    Object.assign(val, updateValDto);
    return await this.valRepository.save(val);
  }

  async remove(id: string, user: User): Promise<void> {
    // Validate permissions at service level (double check)
    if (user.role.name !== UserRole.DIRECTION) {
      throw new ForbiddenException('Only Direction can delete VAL records');
    }

    const val = await this.findOne(id, user);
    await this.valRepository.remove(val);
  }
}

