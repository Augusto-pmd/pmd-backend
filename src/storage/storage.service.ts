import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleDriveService } from './drivers/google-drive.service';
import { DropboxService } from './drivers/dropbox.service';

/**
 * Storage service for file uploads
 * Supports Google Drive and Dropbox as storage backends
 * 
 * Configuration priority:
 * 1. Google Drive (if GOOGLE_DRIVE_* env vars are set)
 * 2. Dropbox (if DROPBOX_ACCESS_TOKEN is set)
 * 3. Local storage (fallback)
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private storageType: 'google-drive' | 'dropbox' | 'local' = 'local';

  constructor(
    private configService: ConfigService,
    private googleDriveService: GoogleDriveService,
    private dropboxService: DropboxService,
  ) {
    // Determine which storage backend to use
    if (this.googleDriveService.isConfigured()) {
      this.storageType = 'google-drive';
      this.logger.log('Using Google Drive as storage backend');
    } else if (this.dropboxService.isConfigured()) {
      this.storageType = 'dropbox';
      this.logger.log('Using Dropbox as storage backend');
    } else {
      this.storageType = 'local';
      this.logger.debug('Using local storage (no cloud storage configured)');
    }
  }

  /**
   * Upload a file to storage
   * @param filePath - Path to the file to upload
   * @param fileName - Optional custom file name
   * @returns Promise resolving to the file URL
   */
  async uploadFile(filePath: string, fileName?: string): Promise<string> {
    try {
      switch (this.storageType) {
        case 'google-drive':
          return await this.googleDriveService.uploadFile(filePath, fileName);
        case 'dropbox':
          return await this.dropboxService.uploadFile(filePath, fileName);
        default:
          // Local storage - just return the file path
          return filePath;
      }
    } catch (error) {
      this.logger.warn(`Failed to upload to ${this.storageType}, falling back to local storage: ${error.message}`);
      // Fallback to local storage
      return filePath;
    }
  }

  /**
   * Upload a file from Express Multer file object
   * @param file - Express Multer file object
   * @returns Promise resolving to the file URL
   */
  async uploadMulterFile(file: Express.Multer.File): Promise<string> {
    return await this.uploadFile(file.path, file.originalname);
  }

  /**
   * Delete a file from storage
   * @param fileUrl - URL of the file to delete
   */
  async deleteFile(fileUrl: string): Promise<void> {
    // If it's a local path, don't try to delete from cloud storage
    if (!fileUrl.startsWith('http') && !fileUrl.startsWith('https')) {
      // Local file path, nothing to delete from cloud
      return;
    }

    try {
      switch (this.storageType) {
        case 'google-drive':
          if (fileUrl.includes('drive.google.com')) {
            await this.googleDriveService.deleteFile(fileUrl);
          }
          break;
        case 'dropbox':
          if (fileUrl.includes('dropbox.com')) {
            await this.dropboxService.deleteFile(fileUrl);
          }
          break;
        default:
          // Local storage - nothing to do
          break;
      }
    } catch (error) {
      this.logger.warn(`Failed to delete file from ${this.storageType}: ${error.message}`);
      // Don't throw - file might already be deleted or URL might be invalid
    }
  }

  /**
   * Get the current storage type
   */
  getStorageType(): 'google-drive' | 'dropbox' | 'local' {
    return this.storageType;
  }

  /**
   * Check if cloud storage is configured
   */
  isCloudStorageEnabled(): boolean {
    return this.storageType !== 'local';
  }
}

