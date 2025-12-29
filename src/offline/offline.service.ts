import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OfflineItem } from './offline-items.entity';
import { CreateOfflineItemDto } from './dto/create-offline-item.dto';
import { User } from '../users/user.entity';

@Injectable()
export class OfflineService {
  private readonly logger = new Logger(OfflineService.name);
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  constructor(
    @InjectRepository(OfflineItem)
    private offlineItemRepository: Repository<OfflineItem>,
  ) {}

  /**
   * Save an offline item
   */
  async saveOfflineItem(
    itemType: string,
    data: Record<string, any>,
    user: User,
  ): Promise<OfflineItem> {
    const offlineItem = this.offlineItemRepository.create({
      item_type: itemType,
      data,
      user_id: user.id,
      is_synced: false,
      synced_at: null,
      error_message: null,
    });

    return await this.offlineItemRepository.save(offlineItem);
  }

  /**
   * Get pending items for a user
   */
  async getPendingItems(user: User): Promise<OfflineItem[]> {
    return await this.offlineItemRepository.find({
      where: {
        user_id: user.id,
        is_synced: false,
      },
      order: {
        created_at: 'ASC',
      },
    });
  }

  /**
   * Get all items (pending and synced) for a user
   */
  async getAllItems(user: User): Promise<OfflineItem[]> {
    return await this.offlineItemRepository.find({
      where: {
        user_id: user.id,
      },
      order: {
        created_at: 'DESC',
      },
    });
  }

  /**
   * Sync a single offline item
   * This method should be called by the specific service handler
   * based on item_type (e.g., ExpensesService, IncomesService, etc.)
   */
  async syncItem(
    itemId: string,
    user: User,
    syncHandler: (data: Record<string, any>, user: User) => Promise<any>,
  ): Promise<OfflineItem> {
    const item = await this.offlineItemRepository.findOne({
      where: {
        id: itemId,
        user_id: user.id,
      },
    });

    if (!item) {
      throw new NotFoundException(`Offline item with ID ${itemId} not found`);
    }

    if (item.is_synced) {
      return item; // Already synced
    }

    let retries = 0;
    let lastError: Error | null = null;

    while (retries < this.MAX_RETRIES) {
      try {
        // Call the sync handler (provided by the calling service)
        await syncHandler(item.data, user);

        // Mark as synced
        item.is_synced = true;
        item.synced_at = new Date();
        item.error_message = null;

        return await this.offlineItemRepository.save(item);
      } catch (error) {
        lastError = error as Error;
        retries++;

        if (retries < this.MAX_RETRIES) {
          // Wait before retrying
          await this.delay(this.RETRY_DELAY * retries);
        } else {
          // Max retries reached, mark with error
          item.error_message = lastError.message || 'Unknown error during sync';
          await this.offlineItemRepository.save(item);
          throw new BadRequestException(
            `Failed to sync item after ${this.MAX_RETRIES} attempts: ${lastError.message}`,
          );
        }
      }
    }

    throw lastError || new Error('Sync failed');
  }

  /**
   * Sync all pending items for a user
   * Note: This method requires sync handlers to be provided by the calling controller/service
   * The actual sync logic should be handled by the respective services (ExpensesService, etc.)
   */
  async syncOfflineItems(
    user: User,
    syncHandlers: Map<string, (data: Record<string, any>, user: User) => Promise<any>>,
  ): Promise<{ synced: number; failed: number; errors: string[] }> {
    const pendingItems = await this.getPendingItems(user);
    const results = {
      synced: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const item of pendingItems) {
      const handler = syncHandlers.get(item.item_type);

      if (!handler) {
        this.logger.warn(
          `No sync handler found for item type: ${item.item_type}`,
        );
        item.error_message = `No sync handler found for type: ${item.item_type}`;
        await this.offlineItemRepository.save(item);
        results.failed++;
        results.errors.push(
          `Item ${item.id}: No handler for type ${item.item_type}`,
        );
        continue;
      }

      try {
        await this.syncItem(item.id, user, handler);
        results.synced++;
      } catch (error) {
        results.failed++;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Item ${item.id}: ${errorMessage}`);
        this.logger.error(
          `Failed to sync item ${item.id}: ${errorMessage}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return results;
  }

  /**
   * Mark an item as synced (used when sync is handled externally)
   */
  async markAsSynced(itemId: string, user: User): Promise<OfflineItem> {
    const item = await this.offlineItemRepository.findOne({
      where: {
        id: itemId,
        user_id: user.id,
      },
    });

    if (!item) {
      throw new NotFoundException(`Offline item with ID ${itemId} not found`);
    }

    item.is_synced = true;
    item.synced_at = new Date();
    item.error_message = null;

    return await this.offlineItemRepository.save(item);
  }

  /**
   * Mark an item with an error
   */
  async markAsError(
    itemId: string,
    user: User,
    errorMessage: string,
  ): Promise<OfflineItem> {
    const item = await this.offlineItemRepository.findOne({
      where: {
        id: itemId,
        user_id: user.id,
      },
    });

    if (!item) {
      throw new NotFoundException(`Offline item with ID ${itemId} not found`);
    }

    item.error_message = errorMessage;

    return await this.offlineItemRepository.save(item);
  }

  /**
   * Delete a synced item
   */
  async deleteSyncedItem(itemId: string, user: User): Promise<void> {
    const item = await this.offlineItemRepository.findOne({
      where: {
        id: itemId,
        user_id: user.id,
        is_synced: true,
      },
    });

    if (!item) {
      throw new NotFoundException(
        `Synced offline item with ID ${itemId} not found`,
      );
    }

    await this.offlineItemRepository.remove(item);
  }

  /**
   * Clear all synced items for a user
   */
  async clearSyncedItems(user: User): Promise<number> {
    const result = await this.offlineItemRepository.delete({
      user_id: user.id,
      is_synced: true,
    });

    return result.affected || 0;
  }

  /**
   * Helper method to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

