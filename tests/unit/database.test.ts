import { describe, expect, it } from 'vitest';
import { itemsRepository } from '../../src/lib/db/database';
import type { InventoryItem } from '../../src/types/inventory';

const item: InventoryItem = {
    id: 'test-item',
    name: 'Test lamp',
    category: 'Lighting',
    description: 'A brass lamp.',
    tags: ['brass'],
    imageBlob: new Blob(['thumbnail'], { type: 'image/jpeg' }),
    estimatedValue: 45,
    createdAt: 1,
};

describe('itemsRepository', () => {
    it('persists, reads, updates, and deletes an item with its Blob', async () => {
        await itemsRepository.put(item);
        const saved = await itemsRepository.list();
        expect(saved).toHaveLength(1);
        expect(saved[0]).toMatchObject({ id: item.id, name: item.name, category: item.category, description: item.description, tags: item.tags, estimatedValue: item.estimatedValue, createdAt: item.createdAt });
        expect(saved[0].imageBlob).toBeDefined();

        const updated = { ...item, name: 'Updated lamp', estimatedValue: 60 };
        await itemsRepository.put(updated);
        const updatedItems = await itemsRepository.list();
        expect(updatedItems[0]).toMatchObject({ name: 'Updated lamp', estimatedValue: 60 });
        expect(updatedItems[0].imageBlob).toBeDefined();

        await itemsRepository.delete(item.id);
        expect(await itemsRepository.list()).toEqual([]);
    });
});