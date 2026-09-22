import { z } from 'zod';
import { CATEGORIES, type DetectedItem } from '../../types/inventory';

const boundingBoxSchema = z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    w: z.number().min(0).max(1),
    h: z.number().min(0).max(1),
});

const detectedItemSchema = z.object({
    name: z.string().min(1),
    category: z.enum(CATEGORIES),
    description: z.string(),
    suggestedTags: z.array(z.string()),
    confidence: z.number().min(0).max(1),
    bbox: boundingBoxSchema,
});

export const detectionResponseSchema = z.object({
    items: z.array(detectedItemSchema).max(20),
});

const categoryAliases: Record<string, (typeof CATEGORIES)[number]> = {
    'home decor': 'Decor',
    'book': 'Books & Media',
    'media': 'Books & Media',
    'kitchen': 'Kitchenware',
    'garden': 'Plants',
};

function asNumber(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeBoundingBox(value: unknown) {
    if (Array.isArray(value) && value.length === 4) {
        const [x, y, w, h] = value.map((entry) => asNumber(entry, 0));
        return { x, y, w, h };
    }
    if (!value || typeof value !== 'object') return { x: 0, y: 0, w: 1, h: 1 };
    const box = value as Record<string, unknown>;
    if ('x' in box && 'y' in box && 'w' in box && 'h' in box) {
        return { x: asNumber(box.x, 0), y: asNumber(box.y, 0), w: asNumber(box.w, 1), h: asNumber(box.h, 1) };
    }
    const left = asNumber(box.xMin ?? box.left, 0);
    const top = asNumber(box.yMin ?? box.top, 0);
    const right = asNumber(box.xMax ?? box.right, 1);
    const bottom = asNumber(box.yMax ?? box.bottom, 1);
    return { x: left, y: top, w: right - left, h: bottom - top };
}

function clamp(value: number) {
    return Math.min(1, Math.max(0, value));
}

function normalizeItem(value: unknown) {
    if (!value || typeof value !== 'object') return value;
    const item = value as Record<string, unknown>;
    const rawCategory = typeof item.category === 'string' ? item.category.trim() : 'Other';
    const category = CATEGORIES.includes(rawCategory as (typeof CATEGORIES)[number])
        ? rawCategory
        : categoryAliases[rawCategory.toLowerCase()] || 'Other';
    const rawConfidence = asNumber(item.confidence ?? item.score, 0.5);
    const confidence = rawConfidence > 1 && rawConfidence <= 100 ? rawConfidence / 100 : rawConfidence;
    const rawBox = item.bbox ?? item.boundingBox;
    const box = normalizeBoundingBox(rawBox);
    const scale = Math.max(Math.abs(box.x), Math.abs(box.y), Math.abs(box.w), Math.abs(box.h)) > 1 ? 1000 : 1;
    return {
        name: typeof item.name === 'string' ? item.name.trim() : '',
        category,
        description: typeof item.description === 'string' ? item.description : '',
        suggestedTags: Array.isArray(item.suggestedTags)
            ? item.suggestedTags.filter((tag): tag is string => typeof tag === 'string')
            : typeof item.tags === 'string' ? item.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
        confidence,
        bbox: { x: clamp(box.x / scale), y: clamp(box.y / scale), w: clamp(box.w / scale), h: clamp(box.h / scale) },
    };
}

export function parseDetectionResponse(value: unknown): DetectedItem[] {
    const rawItems = value && typeof value === 'object' && Array.isArray((value as { items?: unknown }).items)
        ? (value as { items: unknown[] }).items
        : value && typeof value === 'object' && Array.isArray((value as { objects?: unknown }).objects)
            ? (value as { objects: unknown[] }).objects
            : [];
    const result = detectionResponseSchema.safeParse({ items: rawItems.map(normalizeItem) });
    if (!result.success) {
        const issue = result.error.issues[0];
        throw new Error(`Gemini returned an invalid detection response (${issue?.path.join('.') || 'unknown field'}). Please try another image.`);
    }
    return result.data.items;
}