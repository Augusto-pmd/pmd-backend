import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rubric } from './rubrics.entity';
import { CreateRubricDto } from './dto/create-rubric.dto';
import { UpdateRubricDto } from './dto/update-rubric.dto';

@Injectable()
export class RubricsService {
  constructor(
    @InjectRepository(Rubric)
    private rubricRepository: Repository<Rubric>,
  ) {}

  async create(createRubricDto: CreateRubricDto): Promise<Rubric> {
    const rubric = this.rubricRepository.create(createRubricDto);
    return await this.rubricRepository.save(rubric);
  }

  async findAll(): Promise<Rubric[]> {
    try {
      return await this.rubricRepository.find({
        where: { is_active: true },
        order: { name: 'ASC' },
      });
    } catch (error) {
      console.error('[RubricsService.findAll] Error:', error);
      return [];
    }
  }

  async findOne(id: string): Promise<Rubric> {
    const rubric = await this.rubricRepository.findOne({ where: { id } });

    if (!rubric) {
      throw new NotFoundException(`Rubric with ID ${id} not found`);
    }

    return rubric;
  }

  async update(id: string, updateRubricDto: UpdateRubricDto): Promise<Rubric> {
    const rubric = await this.findOne(id);
    Object.assign(rubric, updateRubricDto);
    return await this.rubricRepository.save(rubric);
  }

  async remove(id: string): Promise<void> {
    const rubric = await this.findOne(id);
    await this.rubricRepository.remove(rubric);
  }
}


