import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { GoogleDriveService } from './drivers/google-drive.service';
import { DropboxService } from './drivers/dropbox.service';

@Module({
  providers: [StorageService, GoogleDriveService, DropboxService],
  exports: [StorageService],
})
export class StorageModule {}

