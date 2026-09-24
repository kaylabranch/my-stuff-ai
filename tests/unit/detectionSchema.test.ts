import { describe, expect, it } from 'vitest';
import { parseDetectionResponse } from '../../src/lib/ai/detectionSchema';

const validItem = {
    name: 'Reading chair',
    category: 'Furniture',
    description: 'A green upholstered chair.',
    suggestedTags: ['green'],
    confidence: 0.9,
    estimatedValue: 80,
    bbox: { x: 0.1, y: 0.1, w: 0.4, h: 0.6 },
};

describe('parseDetectionResponse', () => {
    it('accepts the stable Gemini detection shape', () => {
        expect(parseDetectionResponse({ items: [validItem] })).toEqual([validItem]);
    });

    it('rejects malformed or unsafe model data', () => {
        expect(() => parseDetectionResponse({ items: [{ ...validItem, name: '' }] })).toThrow(
            /invalid detection response/,
        );
    });

    it('normalizes common Gemini field variations', () => {
        expect(
            parseDetectionResponse({
                objects: [
                    {
                        name: 'Lamp',
                        category: 'Home Decor',
                        tags: 'brass, table',
                        confidence: 92,
                        boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.4, yMax: 0.8 },
                    },
                ],
            }),
        ).toEqual([
            {
                name: 'Lamp',
                category: 'Decor',
                description: '',
                suggestedTags: ['brass', 'table'],
                confidence: 0.92,
                bbox: { x: 0.1, y: 0.2, w: 0.30000000000000004, h: 0.6000000000000001 },
                estimatedValue: 0,
            },
        ]);
    });

    it('normalizes Gemini boxes returned on a 0 to 1000 scale', () => {
        expect(
            parseDetectionResponse({ items: [{ ...validItem, bbox: { x: 100, y: 200, w: 300, h: 600 } }] })[0].bbox,
        ).toEqual({ x: 0.1, y: 0.2, w: 0.3, h: 0.6 });
    });

    it('normalizes width/height fields and percentage coordinates', () => {
        expect(
            parseDetectionResponse({ items: [{ ...validItem, bbox: { x: 20, y: 30, width: 40, height: 50 } }] })[0]
                .bbox,
        ).toEqual({ x: 0.2, y: 0.3, w: 0.4, h: 0.5 });
    });

    it('rejects detections without a bounding box instead of using the full image', () => {
        expect(() => parseDetectionResponse({ items: [{ ...validItem, bbox: undefined }] })).toThrow(/bbox/);
    });

    it('accepts Gemini box aliases and mixed edge formats', () => {
        expect(
            parseDetectionResponse({ items: [{ ...validItem, bbox: undefined, box_2d: [100, 200, 500, 800] }] })[0]
                .bbox,
        ).toEqual({ x: 0.2, y: 0.1, w: 0.6, h: 0.4 });
        expect(
            parseDetectionResponse({
                items: [{ ...validItem, bbox: { XMIN: 100, YMIN: 200, XMAX: 500, YMAX: 800 } }],
            })[0].bbox,
        ).toEqual({ x: 0.1, y: 0.2, w: 0.4, h: 0.6 });
        expect(
            parseDetectionResponse({ items: [{ ...validItem, bbox: { x1: 0.1, y1: 0.2, x2: 0.4, y2: 0.8 } }] })[0].bbox,
        ).toEqual({ x: 0.1, y: 0.2, w: 0.30000000000000004, h: 0.6000000000000001 });
    });
});
