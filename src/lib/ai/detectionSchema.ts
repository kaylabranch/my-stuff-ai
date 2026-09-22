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

export function parseDetectionResponse(value: unknown): DetectedItem[] {
    const result = detectionResponseSchema.safeParse(value);
    if (!result.success) {
        throw new Error('Gemini returned an invalid detection response. Please try another image.');
    }
    return result.data.items;
}