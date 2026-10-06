import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DetectionReviewModal, type ReviewItem } from '../../src/components/detection/DetectionReviewModal';

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
                thumbnails={[null]}
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

    it('shows the supplied thumbnail, falls back to an icon when null, and does not recreate URLs on edits', () => {
        const props = {
            file: new File(['photo'], 'room.png', { type: 'image/png' }),
            roomName: '',
            rooms: [],
            isSaving: false,
            onRoomNameChange: vi.fn(),
            onChange: vi.fn(),
            onToggleRemoved: vi.fn(),
            onClose: vi.fn(),
            onSave: vi.fn(),
        };
        const thumbnails = [new Blob(['thumb'], { type: 'image/jpeg' }), null];
        const items = [reviewItem, { ...reviewItem, name: 'Lamp' }];
        const { rerender } = render(<DetectionReviewModal {...props} items={items} thumbnails={thumbnails} />);

        expect(screen.getByAltText('Crop of Reading chair')).toBeInTheDocument();
        expect(screen.queryByAltText('Crop of Lamp')).not.toBeInTheDocument();
        const urlCalls = vi.mocked(URL.createObjectURL).mock.calls.length;

        rerender(
            <DetectionReviewModal
                {...props}
                items={[{ ...items[0], name: 'Armchair' }, items[1]]}
                thumbnails={thumbnails}
            />,
        );
        expect(vi.mocked(URL.createObjectURL).mock.calls.length).toBe(urlCalls);
    });
});
