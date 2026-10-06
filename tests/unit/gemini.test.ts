import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGeminiProvider, describeEmptyResponse } from '../../netlify/functions/providers/gemini';

const image = { mimeType: 'image/png', data: 'abc' };

describe('describeEmptyResponse', () => {
    it('returns null when text is present', () => {
        expect(describeEmptyResponse({ candidates: [{ content: { parts: [{ text: '{}' }] } }] })).toBeNull();
    });

    it('flags unreadable, blocked, truncated, and empty responses', () => {
        expect(describeEmptyResponse(null)).toMatch(/unreadable/);
        expect(describeEmptyResponse({ promptFeedback: { blockReason: 'SAFETY' } })).toMatch(/declined/);
        expect(describeEmptyResponse({ candidates: [{ finishReason: 'MAX_TOKENS' }] })).toMatch(/cut off/);
        expect(describeEmptyResponse({ candidates: [] })).toMatch(/no results/);
    });
});

describe('createGeminiProvider', () => {
    afterEach(() => vi.unstubAllGlobals());

    const provider = createGeminiProvider((name) => ({ GEMINI_API_KEY: 'secret', GEMINI_MODEL: 'test-model' })[name]);
    const stubFetch = (response: Response | Error) =>
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => {
                if (response instanceof Error) throw response;
                return response;
            }),
        );

    it('fails with a 500 when the API key is not configured', () => {
        expect(() => createGeminiProvider(() => undefined)).toThrow(/GEMINI_API_KEY is not configured/);
    });

    it('defaults the model when GEMINI_MODEL is not set', async () => {
        stubFetch(Response.json({ candidates: [{ content: { parts: [{ text: 'hi' }] } }] }));
        await createGeminiProvider((name) => (name === 'GEMINI_API_KEY' ? 'secret' : undefined)).analyze(image);
        expect(vi.mocked(fetch).mock.calls[0][0]).toContain('gemini-3.5-flash-lite');
    });

    it('sends the key in a header, not the URL, and returns the response text', async () => {
        stubFetch(Response.json({ candidates: [{ content: { parts: [{ text: 'hello' }] } }] }));
        expect(await provider.analyze(image)).toBe('hello');
        const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
        expect(url).toContain('test-model');
        expect(url).not.toContain('secret');
        expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('secret');
    });

    it('maps upstream HTTP errors and network failures to AiProviderError', async () => {
        stubFetch(Response.json({ error: { message: 'quota' } }, { status: 429 }));
        await expect(provider.analyze(image)).rejects.toMatchObject({ status: 429, message: /rate-limited/ });

        stubFetch(new Error('network down'));
        await expect(provider.analyze(image)).rejects.toMatchObject({ status: 502 });
    });

    it('rejects an OK response with no usable text', async () => {
        stubFetch(Response.json({ candidates: [] }));
        await expect(provider.analyze(image)).rejects.toMatchObject({ status: 502, message: /no results/ });
    });
});
