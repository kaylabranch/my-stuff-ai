import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeImage } from '../../src/lib/ai/analyzeImage';

const validItem = {
    name: 'Lamp',
    category: 'Lighting',
    description: 'A desk lamp.',
    suggestedTags: [],
    confidence: 0.9,
    estimatedValue: 20,
    bbox: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 },
};

const file = new File(['pixels'], 'room.png', { type: 'image/png' });

describe('analyzeImage', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('posts the base64 image and returns the detected items with progress updates', async () => {
        const fetchSpy = vi.fn(async () => Response.json({ items: [validItem] }));
        vi.stubGlobal('fetch', fetchSpy);
        const onProgress = vi.fn();

        expect(await analyzeImage(file, onProgress)).toEqual([validItem]);

        const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toBe('/.netlify/functions/analyze');
        expect(JSON.parse(init.body as string)).toEqual({ mimeType: 'image/png', data: btoa('pixels') });
        expect(onProgress).toHaveBeenCalledWith({ phase: 'analyzing', progress: 35 });
        expect(onProgress).toHaveBeenLastCalledWith({ phase: 'parsing', progress: 100 });
    });

    it('surfaces the server error message', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: { message: 'Quota hit.' } }, { status: 429 })));
        await expect(analyzeImage(file)).rejects.toThrow('Quota hit.');
    });

    it('falls back to a status-based message when the response is not JSON', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>', { status: 413 })));
        await expect(analyzeImage(file)).rejects.toThrow(/too large/);
    });

    it('reports a network failure, distinguishing offline from unreachable', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => {
            throw new TypeError('Failed to fetch');
        }));
        await expect(analyzeImage(file)).rejects.toThrow(/Could not reach the analysis service/);

        vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
        await expect(analyzeImage(file)).rejects.toThrow(/offline/);
        vi.restoreAllMocks();
    });

    it('rejects a successful response that has no items array', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => Response.json({ something: 'else' })));
        await expect(analyzeImage(file)).rejects.toThrow(/unreadable response/);
    });
});
