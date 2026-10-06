import type {} from '@netlify/functions';

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const MAX_BASE64_LENGTH = 14_000_000;

const systemPrompt = `You are a home inventory vision assistant. Identify every distinct visible household object, including small or partially occluded objects. Treat matching groups as one set when appropriate. Return only JSON in this exact shape:
{"items":[{"name":"Item name","category":"Furniture","description":"One sentence.","suggestedTags":["tag"],"confidence":0.95,"estimatedValue":125,"bbox":{"x":0.1,"y":0.1,"w":0.3,"h":0.4}}]}
Use only these categories: Furniture, Electronics, Appliances, Decor, Lighting, Clothing, Books & Media, Kitchenware, Tools, Sports, Art, Plants, Toys, Storage, Other. Bounding boxes are normalized 0 to 1 and must be present for every item. Return at most 20 items.`;

const jsonResponse = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export default async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') return jsonResponse({ error: { message: 'Method not allowed.' } }, 405);

    const apiKey = Netlify.env.get('GEMINI_API_KEY');
    if (!apiKey) return jsonResponse({ error: { message: 'GEMINI_API_KEY is not configured on the server.' } }, 500);
    const model = Netlify.env.get('GEMINI_MODEL') || DEFAULT_MODEL;

    const body = (await request.json().catch(() => null)) as { mimeType?: unknown; data?: unknown } | null;
    if (
        !body ||
        typeof body.mimeType !== 'string' ||
        !body.mimeType.startsWith('image/') ||
        typeof body.data !== 'string' ||
        !body.data ||
        body.data.length > MAX_BASE64_LENGTH
    ) {
        return jsonResponse({ error: { message: 'A valid image payload is required.' } }, 400);
    }

    const upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { inlineData: { mimeType: body.mimeType, data: body.data } },
                            { text: 'Identify all inventory objects in this image.' },
                        ],
                    },
                ],
                generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
            }),
        },
    ).catch(() => null);

    if (!upstream) return jsonResponse({ error: { message: 'Could not reach Gemini.' } }, 502);
    return new Response(await upstream.text(), {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json' },
    });
};
