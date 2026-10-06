import { parseDetectionResponse } from './detectionSchema';
import type { DetectedItem } from '../../types/inventory';

// The API key and prompt live in the Netlify Function so the key never reaches the browser.
const ANALYZE_ENDPOINT = '/.netlify/functions/analyze';

export interface AnalysisProgress {
    phase: 'reading' | 'analyzing' | 'parsing';
    progress: number;
}

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
        throw new Error('Could not reach the analysis service. Check your connection (or run `netlify dev` locally).');
    });

    const payload = (await response.json().catch(() => null)) as {
        error?: { message?: string };
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    } | null;
    if (!response.ok) throw new Error(payload?.error?.message || `Gemini request failed (${response.status}).`);
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
