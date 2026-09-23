import { describe, expect, it } from 'vitest';
import { getCropRect } from '../../src/lib/images/cropImage';

describe('getCropRect', () => {
    it('adds padding without exceeding image edges', () => {
        expect(getCropRect({ x: 0, y: 0, w: 0.2, h: 0.3 })).toEqual({ x: 0, y: 0, width: 0.26, height: 0.36 });
        expect(getCropRect({ x: 0.8, y: 0.7, w: 0.2, h: 0.3 })).toEqual({ x: 0.74, y: 0.6399999999999999, width: 0.26, height: 0.3600000000000001 });
    });

    it('keeps degenerate boxes cropable', () => {
        const rect = getCropRect({ x: 0.5, y: 0.5, w: 0, h: 0 });
        expect(rect.width).toBeGreaterThan(0);
        expect(rect.height).toBeGreaterThan(0);
    });
});