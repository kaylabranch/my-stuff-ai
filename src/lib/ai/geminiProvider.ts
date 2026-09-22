import { parseDetectionResponse } from './detectionSchema';
import type { DetectedItem } from '../../types/inventory';

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const endpoint = (model: string, apiKey: string) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

const systemPrompt = `You are a home inventory vision assistant. Identify every distinct visible household object, including small or partially occluded objects. Treat matching groups as one set when appropriate. Return only JSON in this exact shape:
{"items":[{"name":"Item name","category":"Furniture","description":"One sentence.","suggestedTags":["tag"],"confidence":0.95,"bbox":{"x":0.1,"y":0.1,"w":0.3,"h":0.4}}]}
Use only these categories: Furniture, Electronics, Appliances, Decor, Lighting, Clothing, Books & Media, Kitchenware, Tools, Sports, Art, Plants, Toys, Storage, Other. Bounding boxes are normalized 0 to 1 and must be present for every item. Return at most 20 items.`;

function extractJson(text: string): unknown {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
    const candidate = fenced ?? text.match(/\{[\s\S]*\}/)?.[0];
    if (!candidate) throw new Error('Gemini returned no JSON detection data.');
    try {
        return JSON.parse(candidate);
    } catch {
        throw new Error('Gemini returned malformed detection data.');
    }
}

export async function analyzeImageWithGemini(file: File): Promise<DetectedItem[]> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
    const model = (import.meta.env.VITE_GEMINI_MODEL as string | undefined) || DEFAULT_MODEL;
    if (!apiKey) throw new Error('Set VITE_GEMINI_API_KEY in .env.local before analyzing images.');

    const base64 = await fileToBase64(file);
    const response = await fetch(endpoint(model, apiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{
                role: 'user', parts: [
                    { inlineData: { mimeType: file.type, data: base64 } },
                    { text: 'Identify all inventory objects in this image.' },
                ]
            }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
        }),
    });

    const payload = await response.json().catch(() => null) as { error?: { message?: string }; candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> } | null;
    if (!response.ok) throw new Error(payload?.error?.message || `Gemini request failed (${response.status}).`);
    const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
    return parseDetectionResponse(extractJson(text));
}

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
        reader.onerror = () => reject(new Error('The selected image could not be read.'));
        reader.readAsDataURL(file);
    });
}