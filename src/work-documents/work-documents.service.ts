import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { WorkDocument } from './work-documents.entity';
import { Work } from '../works/works.entity';
import { CreateWorkDocumentDto } from './dto/create-work-document.dto';
import { UpdateWorkDocumentDto } from './dto/update-work-document.dto';
import { User } from '../users/user.entity';
import { getOrganizationId } from '../common/helpers/get-organization-id.helper';
import { StorageService } from '../storage/storage.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class WorkDocumentsService {
  constructor(
    @InjectRepository(WorkDocument)
    private workDocumentRepository: Repository<WorkDocument>,
    @InjectRepository(Work)
    private workRepository: Repository<Work>,
    private storageService: StorageService,
  ) {}

  async create(createDto: CreateWorkDocumentDto, user: User): Promise<WorkDocument> {
    const work = await this.workRepository.findOne({
      where: { id: createDto.work_id },
    });

    if (!work) {
      throw new NotFoundException(`Work with ID ${createDto.work_id} not found`);
    }

    const organizationId = getOrganizationId(user);
    if (organizationId && work.organization_id !== organizationId) {
      throw new ForbiddenException('Work does not belong to your organization');
    }

    // Si no se proporciona name, extraerlo del file_url
    let documentName = createDto.name;
    if (!documentName && createDto.file_url) {
      // Extraer nombre del archivo desde file_url
      if (createDto.file_url.startsWith('temp://')) {
        // Si es una URL temporal, extraer el nombre después de temp://
        const tempContent = createDto.file_url.replace('temp://', '');
        documentName = tempContent.split('|')[0] || tempContent;
      } else {
        // Si es una URL real, extraer el nombre del archivo
        const urlParts = createDto.file_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        // Remover parámetros de query si existen
        const cleanFileName = fileName.split('?')[0];
        // Remover extensión para el nombre
        documentName = cleanFileName.split('.')[0] || cleanFileName;
      }
    }
    
    // Si aún no hay nombre, usar un valor por defecto
    if (!documentName) {
      documentName = 'Documento sin nombre';
    }

    const document = this.workDocumentRepository.create({
      ...createDto,
      name: documentName,
      // Usar created_by_id del DTO si se proporciona, sino usar el usuario autenticado
      created_by_id: createDto.created_by_id || user.id,
    });
    return await this.workDocumentRepository.save(document);
  }

  async findAll(workId?: string, user?: User): Promise<WorkDocument[]> {
    try {
      const organizationId = user ? getOrganizationId(user) : null;
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
        const workIds = works.map((w) => w.id);
        // If no works found for organization, return empty array
        if (workIds.length === 0) {
          return [];
        }
        where.work_id = In(workIds);
      }

      return await this.workDocumentRepository.find({
        where,
        relations: ['work', 'created_by'],
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[WorkDocumentsService.findAll] Error:', error);
      }
      return [];
    }
  }

  async findOne(id: string, user: User): Promise<WorkDocument> {
    const organizationId = getOrganizationId(user);
    const document = await this.workDocumentRepository.findOne({
      where: { id },
      relations: ['work', 'created_by'],
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
    
    // Eliminar archivo del storage si existe
    if (document.file_url && !document.file_url.startsWith('temp://')) {
      try {
        await this.storageService.deleteFile(document.file_url);
      } catch (error) {
        // No lanzar error si el archivo ya no existe
        console.warn(`Failed to delete file ${document.file_url}:`, error);
      }
    }
    
    await this.workDocumentRepository.remove(document);
  }

  async uploadFile(file: Express.Multer.File, workId: string, documentName?: string): Promise<{ file_url: string; suggested_name?: string }> {
    // Crear directorio temporal si no existe
    const uploadsDir = path.join(process.cwd(), 'uploads', 'work-documents');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const fileName = `${workId}-${timestamp}-${file.originalname}`;
    const filePath = path.join(uploadsDir, fileName);

    // Guardar archivo temporalmente
    // Multer puede proporcionar file.buffer o file.path dependiendo de la configuración
    if (file.buffer) {
      fs.writeFileSync(filePath, file.buffer);
    } else if (file.path) {
      // Si ya está guardado en disco, copiarlo
      fs.copyFileSync(file.path, filePath);
    } else {
      throw new Error('File buffer or path not available');
    }

    try {
      // Subir a storage (Google Drive, Dropbox o local)
      const fileUrl = await this.storageService.uploadFile(filePath, fileName);
      
      // Eliminar archivo temporal después de subir (solo si se subió a cloud storage)
      if (fs.existsSync(filePath) && fileUrl !== filePath) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkError) {
          // No crítico si falla la eliminación
          console.warn(`Failed to delete temporary file ${filePath}:`, unlinkError);
        }
      }

      // Si no se proporcionó documentName, sugerir el nombre del archivo (sin extensión)
      const suggestedName = documentName || file.originalname.split('.')[0];

      return { file_url: fileUrl, suggested_name: suggestedName };
    } catch (error) {
      // Si falla la subida, eliminar archivo temporal
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkError) {
          console.warn(`Failed to delete temporary file ${filePath}:`, unlinkError);
        }
      }
      throw error;
    }
  }

  async downloadFile(id: string, user: User): Promise<{ stream: fs.ReadStream; fileName: string }> {
    const document = await this.findOne(id, user);
    
    if (!document.file_url) {
      throw new NotFoundException('File URL not found for this document');
    }

    // Si es una URL de cloud storage, retornar la URL directamente
    if (document.file_url.startsWith('http://') || document.file_url.startsWith('https://')) {
      // Para cloud storage, el frontend deberá hacer la descarga directamente
      throw new NotFoundException('Cloud storage files must be downloaded directly from the URL');
    }

    // Si es un archivo local
    if (fs.existsSync(document.file_url)) {
      const fileName = path.basename(document.file_url);
      const stream = fs.createReadStream(document.file_url);
      return { stream, fileName };
    }

    throw new NotFoundException('File not found');
  }
}

