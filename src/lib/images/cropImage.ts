import type { BoundingBox } from '../../types/inventory';

export interface CropRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export function getCropRect(boundingBox: BoundingBox): CropRect {
    const padding = 0.06;
    const x = Math.max(0, boundingBox.x - padding);
    const y = Math.max(0, boundingBox.y - padding);
    const right = Math.min(1, boundingBox.x + boundingBox.w + padding);
    const bottom = Math.min(1, boundingBox.y + boundingBox.h + padding);
    return { x, y, width: Math.max(0.01, right - x), height: Math.max(0.01, bottom - y) };
}

export const THUMBNAIL_MAX_EDGE = 320;

/** Scales a crop to fit within maxEdge on its longest side, preserving aspect ratio and never upscaling. */
export function getThumbnailSize(sourceWidth: number, sourceHeight: number, maxEdge = THUMBNAIL_MAX_EDGE) {
    const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
    return {
        width: Math.max(1, Math.round(sourceWidth * scale)),
        height: Math.max(1, Math.round(sourceHeight * scale)),
    };
}

async function cropLoadedImage(image: HTMLImageElement, boundingBox: BoundingBox): Promise<Blob> {
    const { x, y, width, height } = getCropRect(boundingBox);
    const sourceWidth = width * image.naturalWidth;
    const sourceHeight = height * image.naturalHeight;
    const canvas = document.createElement('canvas');
    const size = getThumbnailSize(sourceWidth, sourceHeight);
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image crop is not supported in this browser.');
    context.drawImage(
        image,
        x * image.naturalWidth,
        y * image.naturalHeight,
        sourceWidth,
        sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height,
    );
    return canvasToBlob(canvas);
}

/** Decodes the file once and crops every box; an entry is null where that crop (or the whole decode) failed. */
export async function cropImagesToBlobs(file: File, boundingBoxes: BoundingBox[]): Promise<Array<Blob | null>> {
    if (boundingBoxes.length === 0) return [];
    const sourceUrl = URL.createObjectURL(file);
    try {
        const image = await loadImage(sourceUrl);
        return await Promise.all(boundingBoxes.map((box) => cropLoadedImage(image, box).catch(() => null)));
    } catch {
        return boundingBoxes.map(() => null);
    } finally {
        URL.revokeObjectURL(sourceUrl);
    }
}
function loadImage(sourceUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('The uploaded image could not be rendered.'));
        image.src = sourceUrl;
    });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('The image crop could not be saved.'))),
            'image/jpeg',
            0.86,
        );
    });
}
