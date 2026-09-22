import { describe, expect, it } from 'vitest';
import { parseDetectionResponse } from '../../src/lib/ai/detectionSchema';

const validItem = {
    name: 'Reading chair',
    category: 'Furniture',
    description: 'A green upholstered chair.',
    suggestedTags: ['green'],
    confidence: 0.9,
    bbox: { x: 0.1, y: 0.1, w: 0.4, h: 0.6 },
};

describe('parseDetectionResponse', () => {
    it('accepts the stable Gemini detection shape', () => {
        expect(parseDetectionResponse({ items: [validItem] })).toEqual([validItem]);
    });

    it('rejects malformed or unsafe model data', () => {
        expect(() => parseDetectionResponse({ items: [{ ...validItem, category: 'Unknown' }] })).toThrow(/invalid detection response/);
        expect(() => parseDetectionResponse({ items: [{ ...validItem, bbox: { ...validItem.bbox, w: 2 } }] })).toThrow(/invalid detection response/);
    });
});