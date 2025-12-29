import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OfflineService } from './offline.service';
import { OfflineItem } from './offline-items.entity';
import { createMockUser } from '../common/test/test-helpers';

describe('OfflineService', () => {
  let service: OfflineService;
  let offlineItemRepository: Repository<OfflineItem>;

  const mockOfflineItemRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
  };

  const mockUser = createMockUser();

  const mockOfflineItem: OfflineItem = {
    id: 'offline-item-id',
    item_type: 'expense',
    data: { action: 'create', payload: { amount: 1000 } },
    user_id: mockUser.id,
    is_synced: false,
    synced_at: null,
    error_message: null,
    created_at: new Date(),
    user: mockUser,
  } as OfflineItem;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfflineService,
        {
          provide: getRepositoryToken(OfflineItem),
          useValue: mockOfflineItemRepository,
        },
      ],
    }).compile();

    service = module.get<OfflineService>(OfflineService);
    offlineItemRepository = module.get<Repository<OfflineItem>>(
      getRepositoryToken(OfflineItem),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('saveOfflineItem', () => {
    it('should save an offline item', async () => {
      const itemType = 'expense';
      const data = { action: 'create', payload: { amount: 1000 } };

      mockOfflineItemRepository.create.mockReturnValue({
        ...mockOfflineItem,
        item_type: itemType,
        data,
      });
      mockOfflineItemRepository.save.mockResolvedValue(mockOfflineItem);

      const result = await service.saveOfflineItem(itemType, data, mockUser);

      expect(result).toEqual(mockOfflineItem);
      expect(mockOfflineItemRepository.create).toHaveBeenCalledWith({
        item_type: itemType,
        data,
        user_id: mockUser.id,
        is_synced: false,
        synced_at: null,
        error_message: null,
      });
      expect(mockOfflineItemRepository.save).toHaveBeenCalled();
    });
  });

  describe('getPendingItems', () => {
    it('should return pending items for a user', async () => {
      const pendingItems = [mockOfflineItem];
      mockOfflineItemRepository.find.mockResolvedValue(pendingItems);

      const result = await service.getPendingItems(mockUser);

      expect(result).toEqual(pendingItems);
      expect(mockOfflineItemRepository.find).toHaveBeenCalledWith({
        where: {
          user_id: mockUser.id,
          is_synced: false,
        },
        order: {
          created_at: 'ASC',
        },
      });
    });
  });

  describe('getAllItems', () => {
    it('should return all items for a user', async () => {
      const allItems = [mockOfflineItem];
      mockOfflineItemRepository.find.mockResolvedValue(allItems);

      const result = await service.getAllItems(mockUser);

      expect(result).toEqual(allItems);
      expect(mockOfflineItemRepository.find).toHaveBeenCalledWith({
        where: {
          user_id: mockUser.id,
        },
        order: {
          created_at: 'DESC',
        },
      });
    });
  });

  describe('syncItem', () => {
    it('should sync an item successfully', async () => {
      const syncHandler = jest.fn().mockResolvedValue({ id: 'synced-id' });
      const syncedItem = { ...mockOfflineItem, is_synced: true, synced_at: new Date() };

      mockOfflineItemRepository.findOne.mockResolvedValue(mockOfflineItem);
      mockOfflineItemRepository.save.mockResolvedValue(syncedItem);

      const result = await service.syncItem(
        mockOfflineItem.id,
        mockUser,
        syncHandler,
      );

      expect(result.is_synced).toBe(true);
      expect(syncHandler).toHaveBeenCalledWith(mockOfflineItem.data, mockUser);
      expect(mockOfflineItemRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if item not found', async () => {
      mockOfflineItemRepository.findOne.mockResolvedValue(null);

      await expect(
        service.syncItem('non-existent-id', mockUser, jest.fn()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should retry on failure and eventually mark with error', async () => {
      const syncHandler = jest
        .fn()
        .mockRejectedValue(new Error('Sync failed'));
      const errorItem = {
        ...mockOfflineItem,
        error_message: 'Failed to sync item after 3 attempts: Sync failed',
      };

      mockOfflineItemRepository.findOne.mockResolvedValue(mockOfflineItem);
      mockOfflineItemRepository.save.mockResolvedValue(errorItem);

      // Mock delay to speed up test
      jest.spyOn(service as any, 'delay').mockResolvedValue(undefined);

      await expect(
        service.syncItem(mockOfflineItem.id, mockUser, syncHandler),
      ).rejects.toThrow(BadRequestException);

      expect(syncHandler).toHaveBeenCalledTimes(3); // MAX_RETRIES
    });
  });

  describe('markAsSynced', () => {
    it('should mark an item as synced', async () => {
      const syncedItem = {
        ...mockOfflineItem,
        is_synced: true,
        synced_at: new Date(),
        error_message: null,
      };

      mockOfflineItemRepository.findOne.mockResolvedValue(mockOfflineItem);
      mockOfflineItemRepository.save.mockResolvedValue(syncedItem);

      const result = await service.markAsSynced(mockOfflineItem.id, mockUser);

      expect(result.is_synced).toBe(true);
      expect(result.synced_at).toBeInstanceOf(Date);
      expect(result.error_message).toBeNull();
    });

    it('should throw NotFoundException if item not found', async () => {
      mockOfflineItemRepository.findOne.mockResolvedValue(null);

      await expect(
        service.markAsSynced('non-existent-id', mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('clearSyncedItems', () => {
    it('should delete all synced items for a user', async () => {
      mockOfflineItemRepository.delete.mockResolvedValue({ affected: 5 });

      const result = await service.clearSyncedItems(mockUser);

      expect(result).toBe(5);
      expect(mockOfflineItemRepository.delete).toHaveBeenCalledWith({
        user_id: mockUser.id,
        is_synced: true,
      });
    });
  });
});

