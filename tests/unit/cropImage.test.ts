import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cropImagesToBlobs, getCropRect, getThumbnailSize } from '../../src/lib/images/cropImage';

describe('getCropRect', () => {
    it('adds padding without exceeding image edges', () => {
        expect(getCropRect({ x: 0, y: 0, w: 0.2, h: 0.3 })).toEqual({ x: 0, y: 0, width: 0.26, height: 0.36 });
        expect(getCropRect({ x: 0.8, y: 0.7, w: 0.2, h: 0.3 })).toEqual({
            x: 0.74,
            y: 0.6399999999999999,
            width: 0.26,
            height: 0.3600000000000001,
        });
    });

    it('keeps degenerate boxes cropable', () => {
        const rect = getCropRect({ x: 0.5, y: 0.5, w: 0, h: 0 });
        expect(rect.width).toBeGreaterThan(0);
        expect(rect.height).toBeGreaterThan(0);
    });
});

describe('getThumbnailSize', () => {
    it('preserves aspect ratio for wide, tall, and square crops', () => {
        expect(getThumbnailSize(1000, 500)).toEqual({ width: 320, height: 160 });
        expect(getThumbnailSize(500, 1000)).toEqual({ width: 160, height: 320 });
        expect(getThumbnailSize(800, 800)).toEqual({ width: 320, height: 320 });
    });

    it('does not upscale small crops and never returns a zero dimension', () => {
        expect(getThumbnailSize(100, 50)).toEqual({ width: 100, height: 50 });
        expect(getThumbnailSize(10000, 1)).toEqual({ width: 320, height: 1 });
    });
});

describe('cropImagesToBlobs', () => {
    const file = new File(['photo'], 'room.png', { type: 'image/png' });
    const canvases: Array<{ width: number; height: number }> = [];
    let imageShouldLoad: boolean;
    let createObjectURL: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        canvases.length = 0;
        imageShouldLoad = true;
        createObjectURL = vi.fn(() => 'blob:source');
        Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
        Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
        vi.stubGlobal(
            'Image',
            class {
                naturalWidth = 1000;
                naturalHeight = 500;
                onload: (() => void) | null = null;
                onerror: (() => void) | null = null;
                set src(_value: string) {
                    queueMicrotask(() => (imageShouldLoad ? this.onload?.() : this.onerror?.()));
                }
            },
        );
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
            canvases.push(this);
            return { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;
        } as never);
        vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) =>
            callback(new Blob(['jpeg'], { type: 'image/jpeg' })),
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('decodes the file once and sizes each canvas to its crop aspect ratio', async () => {
        const blobs = await cropImagesToBlobs(file, [
            { x: 0, y: 0, w: 0.5, h: 0.5 },
            { x: 0.2, y: 0.2, w: 0.1, h: 0.6 },
        ]);

        expect(blobs).toHaveLength(2);
        expect(blobs.every((blob) => blob instanceof Blob)).toBe(true);
        expect(createObjectURL).toHaveBeenCalledOnce();
        const [wide, tall] = canvases;
        expect(wide.width).toBeGreaterThan(wide.height);
        expect(tall.height).toBeGreaterThan(tall.width);
        expect(Math.max(wide.width, wide.height, tall.width, tall.height)).toBeLessThanOrEqual(320);
    });

    it('returns an empty list without decoding when there are no boxes', async () => {
        expect(await cropImagesToBlobs(file, [])).toEqual([]);
        expect(createObjectURL).not.toHaveBeenCalled();
    });

    it('returns null for every box when the image cannot be decoded', async () => {
        imageShouldLoad = false;
        expect(await cropImagesToBlobs(file, [{ x: 0, y: 0, w: 1, h: 1 }])).toEqual([null]);
    });

    it('returns null only for crops that fail to encode', async () => {
        vi.spyOn(HTMLCanvasElement.prototype, 'toBlob')
            .mockImplementationOnce((callback) => callback(null))
            .mockImplementation((callback) => callback(new Blob(['jpeg'])));
        const blobs = await cropImagesToBlobs(file, [
            { x: 0, y: 0, w: 0.5, h: 0.5 },
            { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
        ]);
        expect(blobs[0]).toBeNull();
        expect(blobs[1]).toBeInstanceOf(Blob);
    });
});
