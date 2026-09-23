import { Camera } from 'lucide-react';
import type { InventoryFilters, InventoryItem } from '../../types/inventory';
import { InventoryToolbar } from './InventoryToolbar';
import { InventoryImage } from './InventoryImage';

interface InventorySectionProps {
    items: InventoryItem[];
    visibleItems: InventoryItem[];
    filters: InventoryFilters;
    tags: string[];
    view: 'grid' | 'list';
    isLoading: boolean;
    error: string | null;
    onFilterChange: <Key extends keyof InventoryFilters>(key: Key, value: InventoryFilters[Key]) => void;
    onViewChange: (view: 'grid' | 'list') => void;
}

export function InventorySection({ items, visibleItems, filters, tags, view, isLoading, error, onFilterChange, onViewChange }: InventorySectionProps) {
    return (
        <section className="inventory-section">
            <InventoryToolbar filters={filters} tags={tags} view={view} onFilterChange={onFilterChange} onViewChange={onViewChange} />
            {error && <p className="error-message">{error}</p>}
            {isLoading ? <div className="empty-state"><Camera size={28} /><h2>Loading your inventory</h2></div> : visibleItems.length === 0 ? <div className="empty-state"><Camera size={32} /><h2>{items.length === 0 ? 'Your inventory is empty' : 'No items match your filters'}</h2><p>{items.length === 0 ? 'Upload a photo to get started.' : 'Try adjusting your search or filters.'}</p></div> : <div className={view === 'grid' ? 'inventory-grid' : 'inventory-list'}>{visibleItems.map((item) => <article className="item-card" key={item.id}><div className="image-placeholder"><InventoryImage blob={item.imageBlob} alt={item.name} /></div><div><div className="item-meta"><p className="item-category">{item.category}</p><span className="item-value">${item.estimatedValue.toLocaleString()}</span></div><h2>{item.name}</h2><p>{item.description}</p></div></article>)}</div>}
        </section>
    );
}
