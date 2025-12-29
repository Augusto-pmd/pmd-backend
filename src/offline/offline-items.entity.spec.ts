import { OfflineItem } from './offline-items.entity';

describe('OfflineItem Entity', () => {
  it('should be defined', () => {
    expect(OfflineItem).toBeDefined();
  });

  it('should have all required properties', () => {
    const item = new OfflineItem();
    item.id = 'test-id';
    item.item_type = 'expense';
    item.data = { test: 'data' };
    item.user_id = 'user-id';
    item.is_synced = false;
    item.synced_at = null;
    item.error_message = null;
    item.created_at = new Date();

    expect(item.id).toBe('test-id');
    expect(item.item_type).toBe('expense');
    expect(item.data).toEqual({ test: 'data' });
    expect(item.user_id).toBe('user-id');
    expect(item.is_synced).toBe(false);
    expect(item.synced_at).toBeNull();
    expect(item.error_message).toBeNull();
    expect(item.created_at).toBeInstanceOf(Date);
  });

  it('should accept JSONB data', () => {
    const item = new OfflineItem();
    const complexData = {
      action: 'create',
      entity: 'expense',
      payload: {
        amount: 1000,
        currency: 'ARS',
        supplier_id: 'supplier-123',
      },
    };

    item.data = complexData;
    expect(item.data).toEqual(complexData);
    expect(item.data.action).toBe('create');
    expect(item.data.payload.amount).toBe(1000);
  });
});

