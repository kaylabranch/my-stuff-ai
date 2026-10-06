import { AiProviderError } from './aiErrors';
import { parseDetectionResponse } from './detectionSchema';
import type { DetectedItem } from '../../types/inventory';

export interface ImagePayload {
    mimeType: string;
    /** Base64 image bytes without a data-URL prefix. */
    data: string;
}

/** A vision backend: takes an image and returns the model's raw text, or throws AiProviderError. */
export interface VisionProvider {
    analyze(image: ImagePayload): Promise<string>;
}

function extractJson(text: string): unknown {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
    const candidate = fenced ?? text.match(/\{[\s\S]*\}/)?.[0];
    if (!candidate) throw new Error('The AI response did not contain any detection data. Please try again.');
    try {
        return JSON.parse(candidate);
    } catch {
        throw new Error('The AI response was malformed. Please try again.');
    }
}

/** Runs a provider and returns validated detections; any failure becomes an AiProviderError. */
export async function detectItems(provider: VisionProvider, image: ImagePayload): Promise<DetectedItem[]> {
    const text = await provider.analyze(image);
    try {
        return parseDetectionResponse(extractJson(text));
    } catch (caught) {
        throw new AiProviderError(caught instanceof Error ? caught.message : 'The AI response could not be read.', 502);
    }
}
