import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkDocument } from './work-documents.entity';
import { Work } from '../works/works.entity';
import { CreateWorkDocumentDto } from './dto/create-work-document.dto';
import { UpdateWorkDocumentDto } from './dto/update-work-document.dto';
import { User } from '../users/user.entity';

@Injectable()
export class WorkDocumentsService {
  constructor(
    @InjectRepository(WorkDocument)
    private workDocumentRepository: Repository<WorkDocument>,
    @InjectRepository(Work)
    private workRepository: Repository<Work>,
  ) {}

  async create(createDto: CreateWorkDocumentDto, user: User): Promise<WorkDocument> {
    const work = await this.workRepository.findOne({
      where: { id: createDto.work_id },
    });

    if (!work) {
      throw new NotFoundException(`Work with ID ${createDto.work_id} not found`);
    }

    const organizationId = user.organization?.id ?? null;
    if (organizationId && work.organization_id !== organizationId) {
      throw new ForbiddenException('Work does not belong to your organization');
    }

    const document = this.workDocumentRepository.create(createDto);
    return await this.workDocumentRepository.save(document);
  }

  async findAll(workId?: string, user?: User): Promise<WorkDocument[]> {
    const organizationId = user?.organization?.id ?? null;
    const where: any = {};

    if (workId) {
      where.work_id = workId;
      if (organizationId) {
        // Verify work belongs to organization
        const work = await this.workRepository.findOne({
          where: { id: workId },
        });
        if (work && work.organization_id !== organizationId) {
          throw new ForbiddenException('Work does not belong to your organization');
        }
      }
    } else if (organizationId) {
      // Filter by organization through work
      const works = await this.workRepository.find({
        where: { organization_id: organizationId },
        select: ['id'],
      });
      where.work_id = works.map((w) => w.id);
    }

    return await this.workDocumentRepository.find({
      where,
      relations: ['work'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string, user: User): Promise<WorkDocument> {
    const organizationId = user.organization?.id ?? null;
    const document = await this.workDocumentRepository.findOne({
      where: { id },
      relations: ['work'],
    });

    if (!document) {
      throw new NotFoundException(`Work document with ID ${id} not found`);
    }

    if (organizationId && document.work.organization_id !== organizationId) {
      throw new ForbiddenException('Work document does not belong to your organization');
    }

    return document;
  }

  async update(id: string, updateDto: UpdateWorkDocumentDto, user: User): Promise<WorkDocument> {
    const document = await this.findOne(id, user);
    Object.assign(document, updateDto);
    return await this.workDocumentRepository.save(document);
  }

  async remove(id: string, user: User): Promise<void> {
    const document = await this.findOne(id, user);
    await this.workDocumentRepository.remove(document);
  }
}

