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

export async function cropImageToBlob(file: File, boundingBox: BoundingBox): Promise<Blob> {
    const sourceUrl = URL.createObjectURL(file);
    try {
        const image = await loadImage(sourceUrl);
        const { x, y, width, height } = getCropRect(boundingBox);
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 240;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Image crop is not supported in this browser.');
        context.drawImage(
            image,
            x * image.naturalWidth,
            y * image.naturalHeight,
            width * image.naturalWidth,
            height * image.naturalHeight,
            0,
            0,
            canvas.width,
            canvas.height,
        );
        return await canvasToBlob(canvas);
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
