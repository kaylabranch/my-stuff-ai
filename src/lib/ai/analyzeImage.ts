import { describeAiHttpError } from './aiErrors';
import type { DetectedItem } from '../../types/inventory';

// The provider, API key, and prompt live behind this endpoint so the key never reaches the browser.
const ANALYZE_ENDPOINT = '/.netlify/functions/analyze';

export interface AnalysisProgress {
    phase: 'reading' | 'analyzing' | 'parsing';
    progress: number;
}

/** Uploads an image to the analysis endpoint and returns the validated detections. */
export async function analyzeImage(
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

    const payload = (await response.json().catch(() => null)) as {
        error?: { message?: string };
        items?: DetectedItem[];
    } | null;
    if (!response.ok) throw new Error(payload?.error?.message || describeAiHttpError(response.status));
    if (!Array.isArray(payload?.items)) throw new Error('The AI service returned an unreadable response. Please try again.');
    onProgress?.({ phase: 'parsing', progress: 100 });
    return payload.items;
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
