import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { itemsRepository } from '../../src/lib/db/database';
import { cropImagesToBlobs } from '../../src/lib/images/cropImage';
import { analyzeImage } from '../../src/lib/ai/analyzeImage';

vi.mock('../../src/lib/ai/analyzeImage', () => ({ analyzeImage: vi.fn() }));
vi.mock('../../src/lib/images/cropImage', () => ({ cropImagesToBlobs: vi.fn() }));

const detected = (name: string) => ({
    name,
    category: 'Furniture' as const,
    description: '',
    suggestedTags: [],
    confidence: 0.9,
    estimatedValue: 10,
    bbox: { x: 0.1, y: 0.1, w: 0.3, h: 0.3 },
});

async function uploadAndSave(container: HTMLElement, savedCount: number) {
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['original-photo'], 'room.png', { type: 'image/png' })] } });
    await screen.findByRole('dialog', undefined, { timeout: 3000 });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`save ${savedCount} items`, 'i') }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), { timeout: 3000 });
}

describe('App detection save flow', () => {
    beforeEach(async () => {
        Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test') });
        Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
        await itemsRepository.clear();
        vi.mocked(analyzeImage).mockReset();
        vi.mocked(cropImagesToBlobs).mockReset();
        vi.spyOn(itemsRepository, 'put').mockClear();
    });

    it('crops once after detection and saves the same thumbnails', async () => {
        vi.mocked(analyzeImage).mockResolvedValue([detected('Chair'), detected('Lamp')]);
        const thumbnails = [new Blob(['chair-crop'], { type: 'image/jpeg' }), new Blob(['lamp-crop'], { type: 'image/jpeg' })];
        vi.mocked(cropImagesToBlobs).mockResolvedValue(thumbnails);

        const { container } = render(<App />);
        await uploadAndSave(container, 2);

        expect(cropImagesToBlobs).toHaveBeenCalledOnce();
        expect(vi.mocked(cropImagesToBlobs).mock.calls[0][1]).toEqual([detected('Chair').bbox, detected('Lamp').bbox]);
        const savedBlobs = vi.mocked(itemsRepository.put).mock.calls.map(([item]) => item.imageBlob);
        expect(savedBlobs).toEqual(thumbnails);
        expect(savedBlobs[0]).toBe(thumbnails[0]);
        expect(savedBlobs[1]).toBe(thumbnails[1]);
    });

    it('falls back to the original photo when a crop failed', async () => {
        vi.mocked(analyzeImage).mockResolvedValue([detected('Chair')]);
        vi.mocked(cropImagesToBlobs).mockResolvedValue([null]);

        const { container } = render(<App />);
        await uploadAndSave(container, 1);

        const [[saved]] = vi.mocked(itemsRepository.put).mock.calls;
        expect(saved.imageBlob).toBeInstanceOf(File);
        expect((saved.imageBlob as File).name).toBe('room.png');
    });

    it('shows the error message and no review dialog when analysis fails', async () => {
        vi.mocked(analyzeImage).mockRejectedValue(new Error('The AI service is rate-limited or out of quota.'));

        const { container } = render(<App />);
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;
        fireEvent.change(input, { target: { files: [new File(['x'], 'room.png', { type: 'image/png' })] } });

        expect(await screen.findByText(/rate-limited or out of quota/)).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(cropImagesToBlobs).not.toHaveBeenCalled();
    });
});
