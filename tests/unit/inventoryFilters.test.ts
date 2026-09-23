import { describe, expect, it } from 'vitest';
import { filterAndSortInventory } from '../../src/lib/filtering/inventoryFilters';
import type { InventoryItem } from '../../src/types/inventory';

const items: InventoryItem[] = [
    { id: '1', name: 'Reading Chair', category: 'Furniture', description: 'Green chair', tags: ['green', 'living-room'], room: 'Living Room', estimatedValue: 80, createdAt: 2 },
    { id: '2', name: 'Desk Lamp', category: 'Lighting', description: 'Brass lamp', tags: ['brass', 'office'], room: 'Office', estimatedValue: 40, createdAt: 1 },
];

describe('filterAndSortInventory', () => {
    it('combines query, category, and all selected tags', () => {
        expect(filterAndSortInventory(items, { query: 'chair', category: 'Furniture', room: '', tags: ['green', 'living-room'], sort: 'newest' })).toEqual([items[0]]);
    });

    it('sorts values descending', () => {
        expect(filterAndSortInventory(items, { query: '', category: '', room: '', tags: [], sort: 'value-hi' }).map((item) => item.id)).toEqual(['1', '2']);
    });

    it('filters by room', () => {
        expect(filterAndSortInventory(items, { query: '', category: '', room: 'Office', tags: [], sort: 'newest' })).toEqual([items[1]]);
    });
});