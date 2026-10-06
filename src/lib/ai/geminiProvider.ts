import { parseDetectionResponse } from './detectionSchema';
import type { DetectedItem } from '../../types/inventory';

// The API key and prompt live in the Netlify Function so the key never reaches the browser.
const ANALYZE_ENDPOINT = '/.netlify/functions/analyze';

export interface AnalysisProgress {
    phase: 'reading' | 'analyzing' | 'parsing';
    progress: number;
}

interface GeminiPayload {
    error?: { message?: string };
    promptFeedback?: { blockReason?: string };
    candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>;
}

/** Maps a failed analysis response to a user-facing message. */
export function describeAiHttpError(status: number, serverMessage?: string): string {
    if (/api key/i.test(serverMessage ?? '') || status === 401 || status === 403) {
        return 'The AI service rejected the API key. Check GEMINI_API_KEY in the server settings.';
    }
    switch (status) {
        case 400:
            return serverMessage || 'The image could not be processed. Try a different photo.';
        case 404:
            return 'The AI service was not found. Check the deployment includes the analyze function and the configured model name.';
        case 413:
            return 'That photo is too large to analyze. Try a smaller or lower-resolution image.';
        case 429:
            return 'The AI service is rate-limited or out of quota. Wait a minute and try again.';
        case 500:
            return serverMessage || 'The AI service is not configured correctly on the server.';
        case 502:
        case 503:
        case 504:
            return 'The AI service is busy or unreachable. Please try again shortly.';
        default:
            return `Image analysis failed (error ${status}). Please try again.`;
    }
}

/** Explains why a successful response carried no usable text, or returns null if text is present. */
export function describeEmptyResponse(payload: GeminiPayload | null): string | null {
    if (!payload) return 'The AI service returned an unreadable response. Please try again.';
    if (payload.promptFeedback?.blockReason) {
        return 'The AI declined to analyze this image. Try a different photo.';
    }
    const candidate = payload.candidates?.[0];
    if (candidate?.finishReason === 'SAFETY' || candidate?.finishReason === 'PROHIBITED_CONTENT') {
        return 'The AI declined to analyze this image. Try a different photo.';
    }
    if (candidate?.finishReason === 'MAX_TOKENS') {
        return 'The AI response was cut off. Try a photo with fewer objects.';
    }
    const hasText = candidate?.content?.parts?.some((part) => part.text);
    return hasText ? null : 'The AI returned no results for this image. Please try again.';
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

export async function analyzeImageWithGemini(
    file: File,
    onProgress?: (update: AnalysisProgress) => void,
): Promise<DetectedItem[]> {
    const base64 = await fileToBase64(file, (progress) => onProgress?.({ phase: 'reading', progress }));
    onProgress?.({ phase: 'analyzing', progress: 35 });
    const response = await fetch(ANALYZE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mimeType: file.type, data: base64 }),
    }).catch(() => {
        throw new Error(
            navigator.onLine
                ? 'Could not reach the analysis service. Please try again shortly.'
                : 'You appear to be offline. AI analysis needs a network connection.',
        );
    });

    const payload = (await response.json().catch(() => null)) as GeminiPayload | null;
    if (!response.ok) throw new Error(describeAiHttpError(response.status, payload?.error?.message));
    const emptyReason = describeEmptyResponse(payload);
    if (emptyReason) throw new Error(emptyReason);
    onProgress?.({ phase: 'parsing', progress: 92 });
    const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
    const detected = parseDetectionResponse(extractJson(text));
    onProgress?.({ phase: 'parsing', progress: 100 });
    return detected;
}

function fileToBase64(file: File, onProgress?: (progress: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onprogress = (event) => {
            if (event.lengthComputable) onProgress?.((event.loaded / event.total) * 100);
        };
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
        reader.onerror = () => reject(new Error('The selected image could not be read.'));
        reader.readAsDataURL(file);
    });
}
