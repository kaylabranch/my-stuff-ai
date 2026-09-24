import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DetectionReviewModal, type ReviewItem } from '../../src/components/detection/DetectionReviewModal';

vi.mock('../../src/lib/images/cropImage', () => ({
    cropImageToBlob: vi.fn(async () => new Blob(['thumbnail'], { type: 'image/png' })),
}));

const reviewItem: ReviewItem = {
    name: 'Reading chair',
    category: 'Furniture',
    description: 'A green upholstered chair.',
    suggestedTags: ['green'],
    confidence: 0.9,
    bbox: { x: 0.1, y: 0.1, w: 0.4, h: 0.6 },
    estimatedValue: 80,
    removed: false,
};

describe('DetectionReviewModal', () => {
    beforeEach(() => {
        Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test') });
        Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    });

    it('allows saving eligible items without a room name', () => {
        const onSave = vi.fn();
        render(
            <DetectionReviewModal
                file={new File(['photo'], 'room.png', { type: 'image/png' })}
                items={[reviewItem]}
                roomName=""
                rooms={[]}
                isSaving={false}
                onRoomNameChange={vi.fn()}
                onChange={vi.fn()}
                onToggleRemoved={vi.fn()}
                onClose={vi.fn()}
                onSave={onSave}
            />,
        );

        const saveButton = screen.getByRole('button', { name: /save 1 items/i });
        expect(saveButton).toBeEnabled();
        expect(screen.getByLabelText(/room name \(optional\)/i)).not.toBeRequired();

        fireEvent.click(saveButton);
        expect(onSave).toHaveBeenCalledOnce();
    });
});
