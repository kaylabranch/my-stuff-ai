import { describe, expect, it } from 'vitest';
import { filterAndSortInventory } from '../../src/lib/filtering/inventoryFilters';
import type { InventoryItem } from '../../src/types/inventory';

const items: InventoryItem[] = [
    {
        id: '1',
        name: 'Reading Chair',
        category: 'Furniture',
        description: 'Green chair',
        tags: ['green', 'living-room'],
        room: 'Living Room',
        estimatedValue: 80,
        createdAt: 2,
    },
    {
        id: '2',
        name: 'Desk Lamp',
        category: 'Lighting',
        description: 'Brass lamp',
        tags: ['brass', 'office'],
        room: 'Office',
        estimatedValue: 40,
        createdAt: 1,
    },
];

describe('filterAndSortInventory', () => {
    it('combines query, category, and all selected tags', () => {
        expect(
            filterAndSortInventory(items, {
                query: 'chair',
                category: 'Furniture',
                room: '',
                tags: ['green', 'living-room'],
                sort: 'az',
            }),
        ).toEqual([items[0]]);
    });

    it('sorts values descending', () => {
        expect(
            filterAndSortInventory(items, { query: '', category: '', room: '', tags: [], sort: 'value-hi' }).map(
                (item) => item.id,
            ),
        ).toEqual(['1', '2']);
    });

    it('puts items without a value last for both value sort directions', () => {
        const withUnknown: InventoryItem[] = [
            { ...items[0], id: 'none', name: 'No value', estimatedValue: null },
            { ...items[0], id: 'legacy', name: 'Legacy zero', estimatedValue: 0 },
            items[0],
            items[1],
        ];
        const idsFor = (sort: 'value-hi' | 'value-lo') =>
            filterAndSortInventory(withUnknown, { query: '', category: '', room: '', tags: [], sort }).map(
                (item) => item.id,
            );
        expect(idsFor('value-hi')).toEqual(['1', '2', 'none', 'legacy']);
        expect(idsFor('value-lo')).toEqual(['2', '1', 'none', 'legacy']);
    });

    it('filters by room', () => {
        expect(
            filterAndSortInventory(items, { query: '', category: '', room: 'Office', tags: [], sort: 'az' }),
        ).toEqual([items[1]]);
    });
});
