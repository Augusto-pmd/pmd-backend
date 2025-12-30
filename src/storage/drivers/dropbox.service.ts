import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Dropbox Storage Service
 * 
 * This service handles uploading and managing files in Dropbox.
 * 
 * Required environment variables:
 * - DROPBOX_ACCESS_TOKEN: Dropbox API access token
 * - DROPBOX_FOLDER_PATH: (Optional) Folder path where backups will be stored (e.g., '/backups')
 * 
 * To set up:
 * 1. Create a Dropbox app at https://www.dropbox.com/developers/apps
 * 2. Generate an access token with 'files.content.write' and 'files.content.read' scopes
 * 3. Set environment variables
 * 
 * Note: This implementation uses the Dropbox API v2
 * Install required package: npm install dropbox
 */
@Injectable()
export class DropboxService {
  private readonly logger = new Logger(DropboxService.name);
  private readonly accessToken: string | null;
  private readonly folderPath: string;
  private isEnabled: boolean = false;

  constructor(private configService: ConfigService) {
    this.accessToken = this.configService.get<string>('DROPBOX_ACCESS_TOKEN') || null;
    this.folderPath = this.configService.get<string>('DROPBOX_FOLDER_PATH') || '/backups';

    this.isEnabled = !!this.accessToken;

    if (this.isEnabled) {
      this.logger.log('Dropbox storage is enabled');
    } else {
      this.logger.debug('Dropbox storage is disabled (missing access token)');
    }
  }

  /**
   * Check if Dropbox is enabled
   */
  isConfigured(): boolean {
    return this.isEnabled;
  }

  /**
   * Upload a file to Dropbox
   */
  async uploadFile(filePath: string, fileName?: string): Promise<string> {
    if (!this.isEnabled) {
      throw new Error('Dropbox is not configured');
    }

    try {
      // Dynamic import to avoid requiring the package if not installed
      let dropbox;
      try {
        dropbox = await import('dropbox');
      } catch (importError) {
        throw new Error('dropbox package is not installed. Run: npm install dropbox');
      }
      const { Dropbox } = dropbox;
      
      const dbx = new Dropbox({ accessToken: this.accessToken! });

      const fileContent = fs.readFileSync(filePath);
      const dropboxPath = `${this.folderPath}/${fileName || path.basename(filePath)}`;

      const response = await dbx.filesUpload({
        path: dropboxPath,
        contents: fileContent,
        mode: { '.tag': 'overwrite' },
      });

      // Get a shareable link
      const linkResponse = await dbx.sharingCreateSharedLinkWithSettings({
        path: response.result.path_display || dropboxPath,
      });

      const fileUrl = linkResponse.result.url.replace('?dl=0', '?dl=1'); // Make it a direct download link

      this.logger.log(`File uploaded to Dropbox: ${dropboxPath}`);

      return fileUrl;
    } catch (error) {
      this.logger.error(`Failed to upload file to Dropbox: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete a file from Dropbox
   */
  async deleteFile(fileUrl: string): Promise<void> {
    if (!this.isEnabled) {
      throw new Error('Dropbox is not configured');
    }

    try {
      // Extract file path from URL
      const urlMatch = fileUrl.match(/\/s\/([a-zA-Z0-9_-]+)\//);
      if (!urlMatch) {
        throw new Error('Invalid Dropbox URL');
      }

      let dropbox;
      try {
        dropbox = await import('dropbox');
      } catch (importError) {
        throw new Error('dropbox package is not installed. Run: npm install dropbox');
      }
      const { Dropbox } = dropbox;
      const dbx = new Dropbox({ accessToken: this.accessToken! });

      // Get file path from shared link
      const sharedLinkResponse = await dbx.sharingGetSharedLinkMetadata({
        url: fileUrl,
      });

      const filePath = sharedLinkResponse.result.path_lower || '';

      await dbx.filesDeleteV2({
        path: filePath,
      });

      this.logger.log(`File deleted from Dropbox: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from Dropbox: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * List files in the configured folder
   */
  async listFiles(): Promise<any[]> {
    if (!this.isEnabled) {
      return [];
    }

    try {
      let dropbox;
      try {
        dropbox = await import('dropbox');
      } catch (importError) {
        this.logger.warn('dropbox package is not installed. Run: npm install dropbox');
        return [];
      }
      const { Dropbox } = dropbox;
      const dbx = new Dropbox({ accessToken: this.accessToken! });

      const response = await dbx.filesListFolder({
        path: this.folderPath,
      });

      return response.result.entries.map((entry: any) => ({
        id: entry.id,
        name: entry.name,
        path: entry.path_lower,
        size: entry.size,
        modified: entry.server_modified,
      }));
    } catch (error) {
      this.logger.error(`Failed to list files from Dropbox: ${error.message}`, error.stack);
      return [];
    }
  }
}

