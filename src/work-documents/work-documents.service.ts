import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(WorkDocumentsService.name);

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
    // Detectar si estamos en producción (Render)
    const isProduction = process.env.NODE_ENV === 'production' || !!process.env.DATABASE_URL;
    const isRender = !!process.env.RENDER;
    const isCloudStorageEnabled = this.storageService.isCloudStorageEnabled();

    // En producción (Render), SIEMPRE requerir cloud storage
    if ((isProduction || isRender) && !isCloudStorageEnabled) {
      this.logger.error('[uploadFile] Attempting to upload file in production (Render) without cloud storage configured');
      throw new Error(
        'Cloud storage is required in production (Render). ' +
        'Please configure Google Drive or Dropbox storage. ' +
        'Local file storage is not persistent in cloud hosting environments.'
      );
    }

    // Crear directorio temporal si no existe (solo para desarrollo o como paso intermedio)
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
      // En producción, esto DEBE retornar una URL de cloud storage
      const fileUrl = await this.storageService.uploadFile(filePath, fileName);
      
      // En producción, el fileUrl DEBE ser una URL HTTP/HTTPS
      if ((isProduction || isRender) && !fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
        this.logger.error(`[uploadFile] File uploaded to local storage in production: ${fileUrl}`);
        throw new Error(
          'File was saved to local storage in production. ' +
          'Cloud storage must be configured and working. ' +
          'Please check your Google Drive or Dropbox configuration.'
        );
      }
      
      // Eliminar archivo temporal después de subir (siempre en producción, o si se subió a cloud storage)
      if (fs.existsSync(filePath) && ((isProduction || isRender) || fileUrl !== filePath)) {
        try {
          fs.unlinkSync(filePath);
          this.logger.log(`[uploadFile] Temporary file deleted: ${filePath}`);
        } catch (unlinkError) {
          // No crítico si falla la eliminación
          this.logger.warn(`Failed to delete temporary file ${filePath}:`, unlinkError);
        }
      }

      // Si no se proporcionó documentName, sugerir el nombre del archivo (sin extensión)
      const suggestedName = documentName || file.originalname.split('.')[0];

      this.logger.log(`[uploadFile] File uploaded successfully. URL: ${fileUrl}`);
      return { file_url: fileUrl, suggested_name: suggestedName };
    } catch (error) {
      // Si falla la subida, eliminar archivo temporal
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkError) {
          this.logger.warn(`Failed to delete temporary file ${filePath}:`, unlinkError);
        }
      }
      throw error;
    }
  }

  async downloadFile(id: string, user: User): Promise<{ stream: fs.ReadStream | NodeJS.ReadableStream; fileName: string; mimeType?: string } | { redirectUrl: string }> {
    const document = await this.findOne(id, user);
    
    if (!document.file_url) {
      this.logger.error(`[downloadFile] Document ${id} has no file_url`);
      throw new NotFoundException('File URL not found for this document');
    }

    // Decodificar entidades HTML en la URL (ej: &amp;#x2F; -> /)
    let decodedFileUrl = document.file_url;
    try {
      // Decodificar entidades HTML comunes
      decodedFileUrl = decodedFileUrl
        .replace(/&amp;#x2F;/g, '/')
        .replace(/&amp;/g, '&')
        .replace(/&#x2F;/g, '/')
        .replace(/&#x5C;/g, '\\');
    } catch (error) {
      this.logger.warn(`[downloadFile] Failed to decode file_url, using original: ${error.message}`);
    }

    this.logger.log(`[downloadFile] Document ${id} file_url (original): ${document.file_url}`);
    this.logger.log(`[downloadFile] Document ${id} file_url (decoded): ${decodedFileUrl}`);

    // Si es una URL de cloud storage, intentar descargar usando la API
    if (decodedFileUrl.startsWith('http://') || decodedFileUrl.startsWith('https://')) {
      let fileId: string | null = null;
      
      // Detectar si es una URL de Google Drive
      const googleDriveViewMatch = decodedFileUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (googleDriveViewMatch) {
        fileId = googleDriveViewMatch[1];
      }
      
      // Detectar si es una URL de Google Sheets/Docs (docs.google.com)
      if (!fileId) {
        const googleDocsMatch = decodedFileUrl.match(/docs\.google\.com\/(?:spreadsheets|document|presentation|drawings|forms)\/d\/([a-zA-Z0-9_-]+)/);
        if (googleDocsMatch) {
          fileId = googleDocsMatch[1];
          this.logger.log(`[downloadFile] Google Docs/Sheets URL detected, extracted file ID: ${fileId}`);
        }
      }
      
      // Si encontramos un fileId (ya sea de Drive o Docs/Sheets), usar la API
      if (fileId) {
        try {
          // Construir una URL de Google Drive usando el fileId
          const driveUrl = `https://drive.google.com/file/d/${fileId}/view`;
          this.logger.log(`[downloadFile] Using Google Drive API to download file ID: ${fileId}`);
          
          // Usar la API de Google Drive para descargar el archivo directamente
          const downloadResult = await this.storageService.downloadFile(driveUrl);
          if (downloadResult) {
            this.logger.log(`[downloadFile] Google Drive file downloaded via API: ${downloadResult.fileName}`);
            // El stream de Google Drive es un NodeJS.ReadableStream, compatible con .pipe()
            return {
              stream: downloadResult.stream,
              fileName: downloadResult.fileName,
              mimeType: downloadResult.mimeType,
            };
          }
        } catch (error) {
          this.logger.error(`[downloadFile] Failed to download from Google Drive API: ${error.message}`, error.stack);
          // No hacer fallback a redirección - si la API falla, lanzar el error
          // porque redirigir a Google Sheets requiere autenticación y no funcionará
          throw new NotFoundException(
            `Failed to download file from Google Drive. The file may not be accessible or the credentials may be incorrect. Error: ${error.message}`
          );
        }
      }
      
      // Para otros servicios de cloud storage (Dropbox, etc.), redirigir
      this.logger.log(`[downloadFile] Cloud storage URL detected, redirecting to: ${decodedFileUrl}`);
      return { redirectUrl: decodedFileUrl };
    }

    // Detectar si estamos en producción (Render u otro servicio cloud)
    const isProduction = process.env.NODE_ENV === 'production' || !!process.env.DATABASE_URL;
    const isCloudStorageEnabled = this.storageService.isCloudStorageEnabled();
    const isRender = !!process.env.RENDER || decodedFileUrl.includes('/opt/render/');

    // En producción (Render), los archivos locales no están disponibles después de reiniciar
    // Si el archivo es local y estamos en producción, requerir cloud storage
    if ((isProduction || isRender) && !isCloudStorageEnabled) {
      this.logger.error(`[downloadFile] Document ${id} has local file_url in production (Render) without cloud storage configured`);
      this.logger.error(`[downloadFile] File path: ${decodedFileUrl}`);
      this.logger.error(`[downloadFile] In production (Render), cloud storage (Google Drive/Dropbox) is required`);
      throw new NotFoundException(
        'File not available. In production (Render), cloud storage must be configured. ' +
        'Please configure Google Drive or Dropbox storage. ' +
        'Local files are not persistent in cloud hosting environments. ' +
        'This document needs to be re-uploaded with cloud storage configured.'
      );
    }

    // Si es un archivo local (solo en desarrollo o si cloud storage no está configurado)
    const absolutePath = path.isAbsolute(decodedFileUrl) 
      ? decodedFileUrl 
      : path.join(process.cwd(), decodedFileUrl);
    
    if (!fs.existsSync(absolutePath)) {
      // Log detallado para debugging
      this.logger.error(`[downloadFile] File not found at path: ${absolutePath}`);
      this.logger.error(`[downloadFile] Original file_url: ${document.file_url}`);
      this.logger.error(`[downloadFile] Decoded file_url: ${decodedFileUrl}`);
      this.logger.error(`[downloadFile] Document ID: ${id}, Work ID: ${document.work_id}`);
      this.logger.error(`[downloadFile] Current working directory: ${process.cwd()}`);
      this.logger.error(`[downloadFile] Is production: ${isProduction}, Is Render: ${isRender}, Cloud storage enabled: ${isCloudStorageEnabled}`);
      
      // Verificar si el directorio existe
      const dirPath = path.dirname(absolutePath);
      if (!fs.existsSync(dirPath)) {
        this.logger.error(`[downloadFile] Directory does not exist: ${dirPath}`);
      }
      
      // Mensaje más descriptivo para producción/Render
      if (isProduction || isRender) {
        throw new NotFoundException(
          `File not found at path: ${decodedFileUrl}. ` +
          `In production (Render), files must be stored in cloud storage. ` +
          `This document references a local file that is not available. ` +
          `Please re-upload the document with cloud storage configured, or configure Google Drive/Dropbox storage.`
        );
      }
      
      throw new NotFoundException(`File not found at path: ${decodedFileUrl}`);
    }

    const fileName = path.basename(absolutePath);
    const stream = fs.createReadStream(absolutePath);
    this.logger.log(`[downloadFile] Successfully opening file: ${absolutePath}`);
    return { stream, fileName };
  }
}

