import { FileValidator } from '@nestjs/common';
import { IFile } from '@nestjs/common/pipes/file/interfaces';

export class WorkDocumentFileTypeValidator extends FileValidator<{ fileType: RegExp }> {
  // Mapeo de extensiones a MIME types permitidos
  private readonly allowedMimeTypes = [
    // PDF
    'application/pdf',
    // Word
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    // Excel
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    // CAD
    'image/vnd.dwg', // .dwg
    'image/vnd.dxf', // .dxf
  ];

  // Extensiones permitidas
  private readonly allowedExtensions = [
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'jpg',
    'jpeg',
    'png',
    'dwg',
    'dxf',
  ];

  buildErrorMessage(): string {
    return `File type must be one of: ${this.allowedExtensions.join(', ')}`;
  }

  isValid(file: IFile | Express.Multer.File): boolean {
    if (!file) {
      return false;
    }

    // Validar por extensión (prioridad)
    // Express.Multer.File tiene originalname, IFile puede tener diferentes propiedades
    // Usar casting a any para acceder a propiedades que pueden no estar en el tipo
    const fileAny = file as any;
    const fileName = fileAny.originalname || fileAny.name || fileAny.filename || '';
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (extension && this.allowedExtensions.includes(extension)) {
      // Si la extensión es válida, aceptar el archivo
      // (el MIME type puede variar según el navegador/sistema, así que confiamos en la extensión)
      return true;
    }

    // Si no hay extensión válida, validar por MIME type como fallback
    if (file.mimetype && this.allowedMimeTypes.includes(file.mimetype)) {
      return true;
    }

    return false;
  }
}

