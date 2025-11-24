import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Val } from './val.entity';
import { CreateValDto } from './dto/create-val.dto';
import { UpdateValDto } from './dto/update-val.dto';
import { User } from '../users/users.entity';

@Injectable()
export class ValService {
  constructor(
    @InjectRepository(Val)
    private valRepository: Repository<Val>,
  ) {}

  async create(createValDto: CreateValDto, user: User): Promise<Val> {
    const val = this.valRepository.create(createValDto);
    return await this.valRepository.save(val);
  }

  async findAll(user: User): Promise<Val[]> {
    return await this.valRepository.find({
      relations: ['expense'],
      order: { code: 'ASC' },
    });
  }

  async findOne(id: string, user: User): Promise<Val> {
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
    const val = await this.findOne(id, user);
    Object.assign(val, updateValDto);
    return await this.valRepository.save(val);
  }

  async remove(id: string, user: User): Promise<void> {
    const val = await this.findOne(id, user);
    await this.valRepository.remove(val);
  }
}

