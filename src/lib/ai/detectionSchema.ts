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
    estimatedValue: z.number().min(0),
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
        const [top, left, bottom, right] = value.map((entry) => asNumber(entry, 0));
        return { x: left, y: top, w: right - left, h: bottom - top };
    }
    if (!value || typeof value !== 'object') return null;
    const box = Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key.toLowerCase(), entry]));
    if ('x' in box && 'y' in box && 'w' in box && 'h' in box) {
        return { x: asNumber(box.x, 0), y: asNumber(box.y, 0), w: asNumber(box.w, 1), h: asNumber(box.h, 1) };
    }
    if ('x' in box && 'y' in box && 'width' in box && 'height' in box) {
        return { x: asNumber(box.x, 0), y: asNumber(box.y, 0), w: asNumber(box.width, 1), h: asNumber(box.height, 1) };
    }
    if ('left' in box && 'top' in box && 'width' in box && 'height' in box) {
        return { x: asNumber(box.left, 0), y: asNumber(box.top, 0), w: asNumber(box.width, 1), h: asNumber(box.height, 1) };
    }
    if (['x1', 'y1', 'x2', 'y2'].every((key) => key in box)) {
        return { x: asNumber(box.x1, 0), y: asNumber(box.y1, 0), w: asNumber(box.x2, 1) - asNumber(box.x1, 0), h: asNumber(box.y2, 1) - asNumber(box.y1, 0) };
    }
    if (['xmin', 'ymin', 'xmax', 'ymax'].every((key) => key in box) || ['left', 'top', 'right', 'bottom'].every((key) => key in box)) {
        const left = asNumber(box.xmin ?? box.left, 0);
        const top = asNumber(box.ymin ?? box.top, 0);
        const right = asNumber(box.xmax ?? box.right, 1);
        const bottom = asNumber(box.ymax ?? box.bottom, 1);
        return { x: left, y: top, w: right - left, h: bottom - top };
    }
    return null;
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
    const estimatedValue = Math.max(0, asNumber(item.estimatedValue ?? item.estimated_value ?? item.value, 0));
    const rawBox = item.bbox ?? item.boundingBox ?? item.box_2d ?? item.box2d ?? item.box;
    const box = normalizeBoundingBox(rawBox);
    if (!box) return { ...item, name: typeof item.name === 'string' ? item.name.trim() : '', category, description: typeof item.description === 'string' ? item.description : '', suggestedTags: [], confidence, estimatedValue, bbox: null };
    const scale = Math.max(Math.abs(box.x), Math.abs(box.y), Math.abs(box.w), Math.abs(box.h)) > 1
        ? Math.max(Math.abs(box.x), Math.abs(box.y), Math.abs(box.w), Math.abs(box.h)) <= 100 ? 100 : 1000
        : 1;
    return {
        name: typeof item.name === 'string' ? item.name.trim() : '',
        category,
        description: typeof item.description === 'string' ? item.description : '',
        suggestedTags: Array.isArray(item.suggestedTags)
            ? item.suggestedTags.filter((tag): tag is string => typeof tag === 'string')
            : typeof item.tags === 'string' ? item.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
        confidence,
        bbox: { x: clamp(box.x / scale), y: clamp(box.y / scale), w: clamp(box.w / scale), h: clamp(box.h / scale) },
        estimatedValue,
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