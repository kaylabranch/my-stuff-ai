import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGeminiProvider, describeEmptyResponse, toGeminiSchema } from '../../netlify/functions/providers/gemini';
import { DETECTION_JSON_SCHEMA, DETECTION_SYSTEM_PROMPT } from '../../src/lib/ai/detectionPrompt';

const image = { mimeType: 'image/png', data: 'abc' };

describe('toGeminiSchema', () => {
    it('upper-cases every type name, including nested ones, and keeps other keywords', () => {
        const converted = toGeminiSchema(DETECTION_JSON_SCHEMA) as typeof DETECTION_JSON_SCHEMA;
        expect(converted.type).toBe('OBJECT');
        expect(converted.properties.items.type).toBe('ARRAY');
        expect(converted.properties.items.items.properties.bbox.properties.x.type).toBe('NUMBER');
        expect(converted.properties.items.items.properties.category.enum).toContain('Furniture');
        expect(converted.required).toEqual(['items']);
    });

    it('does not mutate the shared schema', () => {
        toGeminiSchema(DETECTION_JSON_SCHEMA);
        expect(DETECTION_JSON_SCHEMA.type).toBe('object');
        expect(DETECTION_JSON_SCHEMA.properties.items.maxItems).toBeDefined();
    });

    it('omits maxItems, which Gemini rejects together with the category enum', () => {
        expect(JSON.stringify(toGeminiSchema(DETECTION_JSON_SCHEMA))).not.toContain('maxItems');
    });
});

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

    it('sends the prompt and a Gemini-format response schema without maxItems', async () => {
        stubFetch(Response.json({ candidates: [{ content: { parts: [{ text: 'hi' }] } }] }));
        await provider.analyze(image);
        const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
        const body = JSON.parse(init.body as string);
        expect(body.systemInstruction.parts[0].text).toBe(DETECTION_SYSTEM_PROMPT);
        expect(body.contents[0].parts[0].inlineData).toEqual({ mimeType: 'image/png', data: 'abc' });
        expect(body.generationConfig.responseMimeType).toBe('application/json');
        expect(body.generationConfig.responseSchema.type).toBe('OBJECT');
        expect(body.generationConfig.responseJsonSchema).toBeUndefined();
        expect(JSON.stringify(body.generationConfig)).not.toContain('maxItems');
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
