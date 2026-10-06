import { AiProviderError, describeAiHttpError } from '../../../src/lib/ai/aiErrors';
import {
    DETECTION_JSON_SCHEMA,
    DETECTION_SYSTEM_PROMPT,
    DETECTION_USER_INSTRUCTION,
} from '../../../src/lib/ai/detectionPrompt';
import type { VisionProvider } from '../../../src/lib/ai/visionProvider';

const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';

export interface GeminiPayload {
    error?: { message?: string };
    promptFeedback?: { blockReason?: string };
    candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>;
}

/** Converts standard JSON Schema to Gemini's schema: upper-case types, no maxItems (Gemini rejects it combined with a large enum; the prompt and parser enforce the limit). */
export function toGeminiSchema(schema: unknown): unknown {
    if (Array.isArray(schema)) return schema.map(toGeminiSchema);
    if (!schema || typeof schema !== 'object') return schema;
    return Object.fromEntries(
        Object.entries(schema)
            .filter(([key]) => key !== 'maxItems')
            .map(([key, value]) => [
                key,
                key === 'type' && typeof value === 'string' ? value.toUpperCase() : toGeminiSchema(value),
            ]),
    );
}

/** Explains why a successful Gemini response carried no usable text, or returns null if text is present. */
export function describeEmptyResponse(payload: GeminiPayload | null): string | null {
    if (!payload) return 'The AI service returned an unreadable response. Please try again.';
    const candidate = payload.candidates?.[0];
    if (
        payload.promptFeedback?.blockReason ||
        candidate?.finishReason === 'SAFETY' ||
        candidate?.finishReason === 'PROHIBITED_CONTENT'
    ) {
        return 'The AI declined to analyze this image. Try a different photo.';
    }
    if (candidate?.finishReason === 'MAX_TOKENS') return 'The AI response was cut off. Try a photo with fewer objects.';
    return candidate?.content?.parts?.some((part) => part.text)
        ? null
        : 'The AI returned no results for this image. Please try again.';
}

/** Builds the provider from GEMINI_API_KEY and optional GEMINI_MODEL; throws a 500 AiProviderError if the key is missing. */
export function createGeminiProvider(getEnv: (name: string) => string | undefined): VisionProvider {
    const apiKey = getEnv('GEMINI_API_KEY');
    if (!apiKey) throw new AiProviderError('GEMINI_API_KEY is not configured on the server.', 500);
    const model = getEnv('GEMINI_MODEL') || DEFAULT_GEMINI_MODEL;

    return {
        async analyze(image) {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                    body: JSON.stringify({
                        systemInstruction: { parts: [{ text: DETECTION_SYSTEM_PROMPT }] },
                        contents: [
                            {
                                role: 'user',
                                parts: [
                                    { inlineData: { mimeType: image.mimeType, data: image.data } },
                                    { text: DETECTION_USER_INSTRUCTION },
                                ],
                            },
                        ],
                        generationConfig: {
                            responseMimeType: 'application/json',
                            responseSchema: toGeminiSchema(DETECTION_JSON_SCHEMA),
                            temperature: 0.1,
                        },
                    }),
                },
            ).catch(() => {
                throw new AiProviderError('Could not reach the AI service. Please try again shortly.', 502);
            });

            const payload = (await response.json().catch(() => null)) as GeminiPayload | null;
            if (!response.ok) {
                console.error(`Gemini request failed (${response.status}): ${payload?.error?.message ?? 'no message'}`);
                throw new AiProviderError(describeAiHttpError(response.status, payload?.error?.message), response.status);
            }
            const emptyReason = describeEmptyResponse(payload);
            if (emptyReason) throw new AiProviderError(emptyReason, 502);
            return payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') ?? '';
        },
    };
}
