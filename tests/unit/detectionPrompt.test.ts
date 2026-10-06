import { describe, expect, it } from 'vitest';
import {
    DETECTION_JSON_SCHEMA,
    DETECTION_SYSTEM_PROMPT,
    MAX_DETECTED_ITEMS,
} from '../../src/lib/ai/detectionPrompt';
import { detectionResponseSchema } from '../../src/lib/ai/detectionSchema';
import { CATEGORIES } from '../../src/types/inventory';

describe('detection prompt and schema', () => {
    it('lists every category in the prompt and the JSON schema enum', () => {
        for (const category of CATEGORIES) expect(DETECTION_SYSTEM_PROMPT).toContain(category);
        expect(DETECTION_JSON_SCHEMA.properties.items.items.properties.category.enum).toEqual([...CATEGORIES]);
    });

    it('uses the same item limit in the prompt, JSON schema, and validator', () => {
        expect(DETECTION_SYSTEM_PROMPT).toContain(`at most ${MAX_DETECTED_ITEMS} items`);
        expect(DETECTION_JSON_SCHEMA.properties.items.maxItems).toBe(MAX_DETECTED_ITEMS);
        const tooMany = { items: Array.from({ length: MAX_DETECTED_ITEMS + 1 }, () => ({})) };
        expect(detectionResponseSchema.safeParse(tooMany).error?.issues.some((issue) => issue.code === 'too_big')).toBe(
            true,
        );
    });

    it('asks for conservative used resale values and to omit the value when unknown', () => {
        expect(DETECTION_SYSTEM_PROMPT).toMatch(/used resale price/);
        expect(DETECTION_SYSTEM_PROMPT).toMatch(/not the price when new/);
        expect(DETECTION_SYSTEM_PROMPT).toMatch(/conservatively/);
        expect(DETECTION_SYSTEM_PROMPT).toMatch(/whole set/);
        expect(DETECTION_SYSTEM_PROMPT).toMatch(/Omit estimatedValue entirely/);
        expect(DETECTION_SYSTEM_PROMPT).not.toMatch(/Use 0 when/);
    });

    it('requires every detection field except the optional estimated value', () => {
        const item = DETECTION_JSON_SCHEMA.properties.items.items;
        expect(item.required).toEqual(
            expect.arrayContaining(['name', 'category', 'description', 'suggestedTags', 'confidence', 'bbox']),
        );
        expect(item.required).not.toContain('estimatedValue');
        expect(item.properties).toHaveProperty('estimatedValue');
        expect(item.properties.bbox.required).toEqual(['x', 'y', 'w', 'h']);
    });
});
