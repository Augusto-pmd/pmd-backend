import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Google Drive Storage Service
 * 
 * This service handles uploading and managing files in Google Drive.
 * 
 * Required environment variables:
 * - GOOGLE_DRIVE_CLIENT_ID: Google OAuth Client ID
 * - GOOGLE_DRIVE_CLIENT_SECRET: Google OAuth Client Secret
 * - GOOGLE_DRIVE_REFRESH_TOKEN: OAuth refresh token
 * - GOOGLE_DRIVE_FOLDER_ID: (Optional) Folder ID where backups will be stored
 * 
 * To set up:
 * 1. Create a project in Google Cloud Console
 * 2. Enable Google Drive API
 * 3. Create OAuth 2.0 credentials
 * 4. Generate refresh token using OAuth 2.0 Playground
 * 5. Set environment variables
 * 
 * Note: This implementation uses the Google Drive API v3
 * Install required package: npm install googleapis
 */
@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);
  private readonly clientId: string | null;
  private readonly clientSecret: string | null;
  private readonly refreshToken: string | null;
  private readonly folderId: string | null;
  private isEnabled: boolean = false;

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('GOOGLE_DRIVE_CLIENT_ID')?.trim() || null;
    this.clientSecret = this.configService.get<string>('GOOGLE_DRIVE_CLIENT_SECRET')?.trim() || null;
    this.refreshToken = this.configService.get<string>('GOOGLE_DRIVE_REFRESH_TOKEN')?.trim() || null;
    this.folderId = this.configService.get<string>('GOOGLE_DRIVE_FOLDER_ID')?.trim() || null;

    this.isEnabled = !!(this.clientId && this.clientSecret && this.refreshToken);

    if (this.isEnabled) {
      this.logger.log('Google Drive storage is enabled');
      // Log partial credentials for debugging (don't log full secrets)
      this.logger.debug(`Client ID: ${this.clientId?.substring(0, 20)}...`);
      this.logger.debug(`Refresh Token: ${this.refreshToken?.substring(0, 20)}...`);
    } else {
      this.logger.warn('Google Drive storage is disabled (missing credentials)');
      if (!this.clientId) this.logger.warn('  - GOOGLE_DRIVE_CLIENT_ID is missing');
      if (!this.clientSecret) this.logger.warn('  - GOOGLE_DRIVE_CLIENT_SECRET is missing');
      if (!this.refreshToken) this.logger.warn('  - GOOGLE_DRIVE_REFRESH_TOKEN is missing');
    }
  }

  /**
   * Check if Google Drive is enabled
   */
  isConfigured(): boolean {
    return this.isEnabled;
  }

  /**
   * Upload a file to Google Drive
   */
  async uploadFile(filePath: string, fileName?: string): Promise<string> {
    if (!this.isEnabled) {
      throw new Error('Google Drive is not configured');
    }

    try {
      // Dynamic import to avoid requiring the package if not installed
      let googleapis;
      try {
        googleapis = await import('googleapis');
      } catch (importError) {
        throw new Error('googleapis package is not installed. Run: npm install googleapis');
      }
      const { google } = googleapis;
      
      // Validate credentials format before creating OAuth2 client
      if (!this.clientId || !this.clientSecret || !this.refreshToken) {
        throw new Error('Google Drive credentials are incomplete. Please check environment variables.');
      }

      // Remove any leading/trailing whitespace that might cause issues
      const clientId = this.clientId.trim();
      const clientSecret = this.clientSecret.trim();
      const refreshToken = this.refreshToken.trim();

      // Validate Client ID format (should end with .apps.googleusercontent.com)
      if (!clientId.includes('.apps.googleusercontent.com')) {
        this.logger.warn(`Client ID format may be incorrect: ${clientId.substring(0, 30)}...`);
      }

      // Validate Refresh Token format (should start with 1//)
      if (!refreshToken.startsWith('1//')) {
        this.logger.warn(`Refresh Token format may be incorrect: ${refreshToken.substring(0, 20)}...`);
      }

      const auth = new google.auth.OAuth2(
        clientId,
        clientSecret,
        'urn:ietf:wg:oauth:2.0:oob', // Redirect URI (not used for refresh token)
      );

      auth.setCredentials({
        refresh_token: refreshToken,
      });

      const drive = google.drive({ version: 'v3', auth });

      const fileMetadata: any = {
        name: fileName || path.basename(filePath),
      };

      if (this.folderId) {
        fileMetadata.parents = [this.folderId];
      }

      const media = {
        mimeType: 'application/octet-stream',
        body: fs.createReadStream(filePath),
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
      });

      const fileId = response.data.id;
      const fileUrl = response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

      this.logger.log(`File uploaded to Google Drive: ${fileId}`);

      return fileUrl;
    } catch (error) {
      this.logger.error(`Failed to upload file to Google Drive: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete a file from Google Drive
   */
  async deleteFile(fileUrl: string): Promise<void> {
    if (!this.isEnabled) {
      throw new Error('Google Drive is not configured');
    }

    try {
      // Extract file ID from URL
      const fileIdMatch = fileUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (!fileIdMatch) {
        throw new Error('Invalid Google Drive URL');
      }

      const fileId = fileIdMatch[1];

      // Dynamic import
      let googleapis;
      try {
        googleapis = await import('googleapis');
      } catch (importError) {
        throw new Error('googleapis package is not installed. Run: npm install googleapis');
      }
      const { google } = googleapis;
      
      const clientId = this.clientId!.trim();
      const clientSecret = this.clientSecret!.trim();
      const refreshToken = this.refreshToken!.trim();

      const auth = new google.auth.OAuth2(
        clientId,
        clientSecret,
        'urn:ietf:wg:oauth:2.0:oob',
      );

      auth.setCredentials({
        refresh_token: refreshToken,
      });

      const drive = google.drive({ version: 'v3', auth });

      await drive.files.delete({
        fileId: fileId,
      });

      this.logger.log(`File deleted from Google Drive: ${fileId}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from Google Drive: ${error.message}`, error.stack);
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
      let googleapis;
      try {
        googleapis = await import('googleapis');
      } catch (importError) {
        this.logger.warn('googleapis package is not installed. Run: npm install googleapis');
        return [];
      }
      const { google } = googleapis;
      
      const clientId = this.clientId!.trim();
      const clientSecret = this.clientSecret!.trim();
      const refreshToken = this.refreshToken!.trim();

      const auth = new google.auth.OAuth2(
        clientId,
        clientSecret,
        'urn:ietf:wg:oauth:2.0:oob',
      );

      auth.setCredentials({
        refresh_token: refreshToken,
      });

      const drive = google.drive({ version: 'v3', auth });

      const query = this.folderId
        ? `'${this.folderId}' in parents and trashed = false`
        : "trashed = false";

      const response = await drive.files.list({
        q: query,
        fields: 'files(id, name, createdTime, size)',
        orderBy: 'createdTime desc',
      });

      return response.data.files || [];
    } catch (error) {
      this.logger.error(`Failed to list files from Google Drive: ${error.message}`, error.stack);
      return [];
    }
  }
}

