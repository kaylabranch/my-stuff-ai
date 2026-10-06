import { describe, expect, it } from 'vitest';
import { AiProviderError } from '../../src/lib/ai/aiErrors';
import { detectItems } from '../../src/lib/ai/visionProvider';

const image = { mimeType: 'image/png', data: 'abc' };
const validItem = {
    name: 'Lamp',
    category: 'Lighting',
    description: 'A desk lamp.',
    suggestedTags: [],
    confidence: 0.9,
    estimatedValue: 20,
    bbox: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 },
};

describe('detectItems', () => {
    it('parses JSON text from the provider, including fenced output', async () => {
        const provider = { analyze: async () => '```json\n' + JSON.stringify({ items: [validItem] }) + '\n```' };
        expect(await detectItems(provider, image)).toEqual([validItem]);
    });

    it('turns missing, malformed, and invalid model output into AiProviderError', async () => {
        for (const text of ['no json here', '{"items": [}', '{"items":[{"name":""}]}']) {
            await expect(detectItems({ analyze: async () => text }, image)).rejects.toMatchObject({ status: 502 });
        }
    });

    it('passes provider errors through unchanged', async () => {
        const failure = new AiProviderError('Quota hit.', 429);
        const provider = {
            analyze: async (): Promise<string> => {
                throw failure;
            },
        };
        await expect(detectItems(provider, image)).rejects.toBe(failure);
    });
});
