import { describe, expect, it } from 'vitest';
import { buildInventoryPdf } from '../../src/lib/pdf/inventoryPdf';
import type { InventoryItem } from '../../src/types/inventory';

const items: InventoryItem[] = [
    {
        id: 'pdf-item',
        name: 'Reading chair',
        category: 'Furniture',
        description: 'A green upholstered chair.',
        tags: ['green', 'living-room'],
        room: 'Living Room',
        imageBlob: new Blob(['not-a-real-jpeg'], { type: 'image/jpeg' }),
        estimatedValue: 80,
        createdAt: 1,
    },
];

describe('buildInventoryPdf', () => {
    it.each([
        { includeSummary: true, includeImages: true, includeValues: true, includeTags: true },
        { includeSummary: false, includeImages: false, includeValues: false, includeTags: false },
        { includeSummary: true, includeImages: false, includeValues: true, includeTags: false },
        { includeSummary: false, includeImages: true, includeValues: false, includeTags: true },
    ])('creates a PDF for option combination %#', async (options) => {
        const pdf = await buildInventoryPdf(items, { title: 'Test inventory', ...options });
        expect(pdf.type).toBe('application/pdf');
        expect(pdf.size).toBeGreaterThan(100);
    });

    it.each([true, false])('handles items and categories with no value (values %s)', async (includeValues) => {
        const unvalued: InventoryItem[] = [
            { ...items[0], id: 'a', estimatedValue: null },
            { ...items[0], id: 'b', category: 'Lighting', estimatedValue: 25 },
            { ...items[0], id: 'c', category: 'Tools', estimatedValue: null },
        ];
        const pdf = await buildInventoryPdf(unvalued, {
            title: 'Test inventory',
            includeSummary: true,
            includeImages: false,
            includeValues,
            includeTags: false,
        });
        expect(pdf.type).toBe('application/pdf');
        expect(pdf.size).toBeGreaterThan(100);
    });

    it('handles an inventory where no item has a value', async () => {
        const pdf = await buildInventoryPdf([{ ...items[0], estimatedValue: null }], {
            title: 'Test inventory',
            includeSummary: true,
            includeImages: false,
            includeValues: true,
            includeTags: true,
        });
        expect(pdf.type).toBe('application/pdf');
    });

    it('handles items with no room without crashing', async () => {
        const itemsWithoutRoom: InventoryItem[] = [{ ...items[0], room: '' }];
        const pdf = await buildInventoryPdf(itemsWithoutRoom, {
            title: 'Test inventory',
            includeSummary: true,
            includeImages: true,
            includeValues: true,
            includeTags: true,
        });
        expect(pdf.type).toBe('application/pdf');
        expect(pdf.size).toBeGreaterThan(100);
    });
});
