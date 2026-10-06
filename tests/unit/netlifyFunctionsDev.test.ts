// @vitest-environment node
import { createServer as createHttpServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createServer as createViteServer, type ViteDevServer } from 'vite';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { netlifyFunctionsDev } from '../../vite-plugins/netlifyFunctionsDev';

const realFetch = fetch;
const ENDPOINT = '/.netlify/functions/analyze';
const image = { mimeType: 'image/png', data: 'abc' };
const item = {
    name: 'Lamp',
    category: 'Lighting',
    description: '',
    suggestedTags: [],
    confidence: 0.9,
    estimatedValue: 5,
    bbox: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 },
};

describe('netlifyFunctionsDev middleware', () => {
    let vite: ViteDevServer;
    let http: Server;
    let baseUrl: string;
    let env: Record<string, string>;

    beforeAll(async () => {
        env = { GEMINI_API_KEY: 'local-secret-key' };
        vite = await createViteServer({
            configFile: false,
            appType: 'custom',
            logLevel: 'silent',
            server: { middlewareMode: true },
            plugins: [netlifyFunctionsDev(new Proxy({}, { get: (_target, name: string) => env[name] }) as Record<string, string>)],
        });
        http = createHttpServer(vite.middlewares);
        await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
        baseUrl = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
    });

    afterAll(async () => {
        http.close();
        await vite.close();
    });

    afterEach(() => vi.unstubAllGlobals());

    // Only calls to Gemini are faked; requests to the local server go through.
    const stubGemini = (reply: () => Response) => {
        const gemini = vi.fn(async () => reply());
        vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
            String(input).startsWith(baseUrl) ? realFetch(input, init) : gemini(),
        );
        return gemini;
    };
    const post = (path: string, body: unknown) =>
        realFetch(`${baseUrl}${path}`, { method: 'POST', body: JSON.stringify(body) });

    it('runs the analyze function with the key from the dev env and returns items', async () => {
        const gemini = stubGemini(() =>
            Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ items: [item] }) }] } }] }),
        );

        const response = await post(ENDPOINT, image);

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ items: [item] });
        expect(gemini).toHaveBeenCalledOnce();
    });

    it('never echoes the API key back to the caller', async () => {
        stubGemini(() => Response.json({ error: { message: 'API key not valid' } }, { status: 400 }));
        const response = await post(ENDPOINT, image);
        expect(await response.text()).not.toContain('local-secret-key');
    });

    it('returns the function error when the key is missing from the dev env', async () => {
        env = {};
        const response = await post(ENDPOINT, image);
        expect(response.status).toBe(500);
        expect((await response.json()).error.message).toMatch(/GEMINI_API_KEY is not configured/);
        env = { GEMINI_API_KEY: 'local-secret-key' };
    });

    it('returns a generic 500 when the function does not exist', async () => {
        const response = await post('/.netlify/functions/does-not-exist', {});
        expect(response.status).toBe(500);
        expect((await response.json()).error.message).toMatch(/local analysis function failed/);
    });

    it('ignores function names that are not simple identifiers', async () => {
        const response = await post('/.netlify/functions/..%2F..%2Fpackage', {});
        expect(response.status).not.toBe(200);
        expect(await response.text()).not.toContain('my-stuff-ai');
    });

    it('passes non-function requests through to the rest of the dev server', async () => {
        const response = await realFetch(`${baseUrl}/not-a-function`);
        expect(response.url).toContain('/not-a-function');
        expect(response.status).toBe(404);
    });
});
