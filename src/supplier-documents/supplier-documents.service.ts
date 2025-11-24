import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupplierDocument } from './supplier-documents.entity';
import { Supplier } from '../suppliers/suppliers.entity';
import { CreateSupplierDocumentDto } from './dto/create-supplier-document.dto';
import { UpdateSupplierDocumentDto } from './dto/update-supplier-document.dto';

@Injectable()
export class SupplierDocumentsService {
  constructor(
    @InjectRepository(SupplierDocument)
    private supplierDocumentRepository: Repository<SupplierDocument>,
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
  ) {}

  async create(createSupplierDocumentDto: CreateSupplierDocumentDto): Promise<SupplierDocument> {
    const supplier = await this.supplierRepository.findOne({
      where: { id: createSupplierDocumentDto.supplier_id },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${createSupplierDocumentDto.supplier_id} not found`);
    }

    const document = this.supplierDocumentRepository.create(createSupplierDocumentDto);
    return await this.supplierDocumentRepository.save(document);
  }

  async findAll(): Promise<SupplierDocument[]> {
    return await this.supplierDocumentRepository.find({
      relations: ['supplier'],
      order: { expiration_date: 'ASC' },
    });
  }

  async findOne(id: string): Promise<SupplierDocument> {
    const document = await this.supplierDocumentRepository.findOne({
      where: { id },
      relations: ['supplier'],
    });

    if (!document) {
      throw new NotFoundException(`Supplier document with ID ${id} not found`);
    }

    return document;
  }

  async update(id: string, updateSupplierDocumentDto: UpdateSupplierDocumentDto): Promise<SupplierDocument> {
    const document = await this.findOne(id);
    Object.assign(document, updateSupplierDocumentDto);
    return await this.supplierDocumentRepository.save(document);
  }

  async remove(id: string): Promise<void> {
    const document = await this.findOne(id);
    await this.supplierDocumentRepository.remove(document);
  }
}


