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
        expect(() => parseDetectionResponse({ items: [{ ...validItem, name: '' }] })).toThrow(/invalid detection response/);
    });

    it('normalizes common Gemini field variations', () => {
        expect(parseDetectionResponse({
            objects: [{
                name: 'Lamp', category: 'Home Decor', tags: 'brass, table', confidence: 92,
                boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.4, yMax: 0.8 },
            }]
        })).toEqual([{
            name: 'Lamp', category: 'Decor', description: '', suggestedTags: ['brass', 'table'], confidence: 0.92,
            bbox: { x: 0.1, y: 0.2, w: 0.30000000000000004, h: 0.6000000000000001 },
        }]);
    });

    it('normalizes Gemini boxes returned on a 0 to 1000 scale', () => {
        expect(parseDetectionResponse({ items: [{ ...validItem, bbox: { x: 100, y: 200, w: 300, h: 600 } }] })[0].bbox).toEqual({ x: 0.1, y: 0.2, w: 0.3, h: 0.6 });
    });
});