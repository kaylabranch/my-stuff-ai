import type {} from '@netlify/functions';
import { AiProviderError } from '../../src/lib/ai/aiErrors';
import { detectItems } from '../../src/lib/ai/visionProvider';
import { createGeminiProvider } from './providers/gemini';

const MAX_BASE64_LENGTH = 14_000_000;

const jsonResponse = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const errorResponse = (message: string, status: number) => jsonResponse({ error: { message } }, status);

export default async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') return errorResponse('Method not allowed.', 405);

    const body = (await request.json().catch(() => null)) as { mimeType?: unknown; data?: unknown } | null;
    if (
        !body ||
        typeof body.mimeType !== 'string' ||
        !body.mimeType.startsWith('image/') ||
        typeof body.data !== 'string' ||
        !body.data ||
        body.data.length > MAX_BASE64_LENGTH
    ) {
        return errorResponse('A valid image payload is required.', 400);
    }

    try {
        const provider = createGeminiProvider((name) => Netlify.env.get(name));
        return jsonResponse({ items: await detectItems(provider, { mimeType: body.mimeType, data: body.data }) }, 200);
    } catch (caught) {
        if (caught instanceof AiProviderError) return errorResponse(caught.message, caught.status);
        console.error(caught);
        return errorResponse('Image analysis failed unexpectedly. Please try again.', 500);
    }
};
