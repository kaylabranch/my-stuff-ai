import { CATEGORIES } from '../../types/inventory';

/** Provider-neutral detection contract shared by every AI backend. */
export const MAX_DETECTED_ITEMS = 20;

export const DETECTION_USER_INSTRUCTION = 'Identify all inventory objects in this image.';

export const DETECTION_SYSTEM_PROMPT = `You are a home inventory vision assistant. Identify every distinct visible household object, including small or partially occluded objects. Treat matching groups as one set when appropriate. Return only JSON in this exact shape:
{"items":[{"name":"Item name","category":"Furniture","description":"One sentence.","suggestedTags":["tag"],"confidence":0.95,"estimatedValue":125,"bbox":{"x":0.1,"y":0.1,"w":0.3,"h":0.4}}]}
Use only these categories: ${CATEGORIES.join(', ')}. Bounding boxes are normalized 0 to 1 and must be present for every item. Return at most ${MAX_DETECTED_ITEMS} items.`;

/** Standard JSON Schema for the detection response; adapters pass it to their provider's structured-output option. */
export const DETECTION_JSON_SCHEMA = {
    type: 'object',
    properties: {
        items: {
            type: 'array',
            maxItems: MAX_DETECTED_ITEMS,
            items: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    category: { type: 'string', enum: [...CATEGORIES] },
                    description: { type: 'string' },
                    suggestedTags: { type: 'array', items: { type: 'string' } },
                    confidence: { type: 'number' },
                    estimatedValue: { type: 'number' },
                    bbox: {
                        type: 'object',
                        properties: {
                            x: { type: 'number' },
                            y: { type: 'number' },
                            w: { type: 'number' },
                            h: { type: 'number' },
                        },
                        required: ['x', 'y', 'w', 'h'],
                    },
                },
                required: ['name', 'category', 'description', 'suggestedTags', 'confidence', 'estimatedValue', 'bbox'],
            },
        },
    },
    required: ['items'],
};
