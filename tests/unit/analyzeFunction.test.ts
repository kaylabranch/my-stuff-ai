import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../netlify/functions/analyze.mts';

const validItem = {
    name: 'Lamp',
    category: 'Lighting',
    description: 'A desk lamp.',
    suggestedTags: [],
    confidence: 0.9,
    estimatedValue: 20,
    bbox: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 },
};

const geminiReply = (text: string) => Response.json({ candidates: [{ content: { parts: [{ text }] } }] });

const post = (body: unknown) =>
    handler(
        new Request('http://localhost/.netlify/functions/analyze', {
            method: 'POST',
            body: typeof body === 'string' ? body : JSON.stringify(body),
        }),
    );

describe('analyze function', () => {
    let env: Record<string, string>;

    beforeEach(() => {
        env = { GEMINI_API_KEY: 'secret' };
        vi.stubGlobal('Netlify', { env: { get: (name: string) => env[name] } });
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('rejects non-POST requests', async () => {
        const response = await handler(new Request('http://localhost/x', { method: 'GET' }));
        expect(response.status).toBe(405);
    });

    it('rejects missing, non-image, empty, and oversized payloads before calling the provider', async () => {
        const fetchSpy = vi.fn();
        vi.stubGlobal('fetch', fetchSpy);
        for (const body of [
            'not json',
            {},
            { mimeType: 'text/plain', data: 'abc' },
            { mimeType: 'image/png', data: '' },
            { mimeType: 'image/png', data: 'a'.repeat(14_000_001) },
        ]) {
            expect((await post(body)).status).toBe(400);
        }
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns a 500 with a clear message when the API key is not configured', async () => {
        env = {};
        const response = await post({ mimeType: 'image/png', data: 'abc' });
        expect(response.status).toBe(500);
        expect((await response.json()).error.message).toMatch(/GEMINI_API_KEY is not configured/);
    });

    it('returns validated items on success', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => geminiReply(JSON.stringify({ items: [validItem] }))));
        const response = await post({ mimeType: 'image/png', data: 'abc' });
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ items: [validItem] });
    });

    it('passes provider errors through with their status and message', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: { message: 'quota' } }, { status: 429 })));
        const response = await post({ mimeType: 'image/png', data: 'abc' });
        expect(response.status).toBe(429);
        expect((await response.json()).error.message).toMatch(/rate-limited/);
    });

    it('returns a 502 when the model output is not valid detection data', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => geminiReply('not json at all')));
        const response = await post({ mimeType: 'image/png', data: 'abc' });
        expect(response.status).toBe(502);
    });

    it('hides unexpected error details behind a generic 500', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => {
            throw new Error('boom');
        }));
        vi.stubGlobal('Netlify', {
            env: {
                get: () => {
                    throw new Error('internal secret detail');
                },
            },
        });
        const response = await post({ mimeType: 'image/png', data: 'abc' });
        expect(response.status).toBe(500);
        expect(JSON.stringify(await response.json())).not.toContain('internal secret detail');
    });
});
