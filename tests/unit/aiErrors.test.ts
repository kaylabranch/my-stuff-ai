import { describe, expect, it } from 'vitest';
import { describeAiHttpError } from '../../src/lib/ai/aiErrors';

describe('describeAiHttpError', () => {
    it('reports rejected API keys for 401, 403, and key messages', () => {
        expect(describeAiHttpError(403)).toMatch(/API key/);
        expect(describeAiHttpError(400, 'API key not valid. Please pass a valid API key.')).toMatch(/API key/);
    });

    it('explains rate limits, oversized images, and unavailable service', () => {
        expect(describeAiHttpError(429)).toMatch(/rate-limited/);
        expect(describeAiHttpError(413)).toMatch(/too large/);
        expect(describeAiHttpError(503)).toMatch(/busy or unreachable/);
        expect(describeAiHttpError(404)).toMatch(/not found/);
    });

    it('uses the server message for configuration errors and a generic fallback otherwise', () => {
        expect(describeAiHttpError(500, 'GEMINI_API_KEY is not configured on the server.')).toMatch(/not configured/);
        expect(describeAiHttpError(418)).toMatch(/error 418/);
    });
});
