import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InventorySection } from '../../src/components/inventory/InventorySection';
import { ItemEditModal } from '../../src/components/inventory/ItemEditModal';
import { StatsRow } from '../../src/components/inventory/StatsRow';
import type { InventoryFilters, InventoryItem } from '../../src/types/inventory';

const filters: InventoryFilters = { query: '', category: '', room: '', tags: [], sort: 'az' };
const baseItem: InventoryItem = {
    id: '1',
    name: 'Reading chair',
    category: 'Furniture',
    description: 'A green chair.',
    tags: [],
    room: '',
    estimatedValue: 80,
    createdAt: 1,
};

const renderSection = (items: InventoryItem[]) =>
    render(
        <InventorySection
            items={items}
            visibleItems={items}
            filters={filters}
            tags={[]}
            rooms={[]}
            view="grid"
            isLoading={false}
            error={null}
            onFilterChange={vi.fn()}
            onClearFilters={vi.fn()}
            onViewChange={vi.fn()}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
        />,
    );

describe('estimated value display', () => {
    it('shows a formatted value on an item card only when the value is known', () => {
        const { container } = renderSection([
            baseItem,
            { ...baseItem, id: '2', name: 'Mystery box', estimatedValue: null },
            { ...baseItem, id: '3', name: 'Legacy item', estimatedValue: 0 },
        ]);

        const values = [...container.querySelectorAll('.item-value')].map((element) => element.textContent);
        expect(values).toEqual(['$80']);
    });

    it('shows the total of known values in the stats, or a dash when none is known', () => {
        const { rerender } = render(
            <StatsRow itemCount={2} categoryCount={1} roomCount={0} tagCount={0} estimatedValue={1250} />,
        );
        expect(screen.getByText('$1,250')).toBeInTheDocument();

        rerender(<StatsRow itemCount={2} categoryCount={1} roomCount={0} tagCount={0} estimatedValue={null} />);
        expect(screen.getByText('\u2014')).toBeInTheDocument();
    });
});

describe('ItemEditModal estimated value', () => {
    const renderModal = (item: InventoryItem, onSave = vi.fn()) => {
        render(<ItemEditModal item={item} rooms={[]} isSaving={false} onSave={onSave} onClose={vi.fn()} />);
        return onSave;
    };
    const submit = () => fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    it('starts blank for an unknown value and saves null when left blank', () => {
        const onSave = renderModal({ ...baseItem, estimatedValue: null });
        expect(screen.getByLabelText(/estimated value/i)).toHaveValue(null);

        submit();
        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ estimatedValue: null }));
    });

    it('shows an existing value and saves an edited one', () => {
        const onSave = renderModal(baseItem);
        const input = screen.getByLabelText(/estimated value/i);
        expect(input).toHaveValue(80);

        fireEvent.change(input, { target: { value: '45' } });
        submit();
        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ estimatedValue: 45 }));
    });

    it('saves null when an existing value is cleared', () => {
        const onSave = renderModal(baseItem);
        fireEvent.change(screen.getByLabelText(/estimated value/i), { target: { value: '' } });
        submit();
        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ estimatedValue: null }));
    });
});
