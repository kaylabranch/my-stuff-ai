import { Grid2X2, List, Search, X } from 'lucide-react';
import { CATEGORIES, type InventoryFilters } from '../../types/inventory';

interface InventoryToolbarProps {
    filters: InventoryFilters;
    tags: string[];
    rooms: string[];
    view: 'grid' | 'list';
    onFilterChange: <Key extends keyof InventoryFilters>(key: Key, value: InventoryFilters[Key]) => void;
    onClearFilters: () => void;
    onViewChange: (view: 'grid' | 'list') => void;
}

export function InventoryToolbar({ filters, tags, rooms, view, onFilterChange, onClearFilters, onViewChange }: InventoryToolbarProps) {
    const hasActiveFilters = filters.query !== '' || filters.category !== '' || filters.room !== '' || filters.tags.length > 0 || filters.sort !== 'newest';
    return (
        <>
            <div className="toolbar">
                <label className="search-field"><Search size={17} /><span className="visually-hidden">Search inventory</span><input value={filters.query} onChange={(event) => onFilterChange('query', event.target.value)} placeholder="Search your inventory" /></label>
                <select value={filters.sort} onChange={(event) => onFilterChange('sort', event.target.value as InventoryFilters['sort'])} aria-label="Sort inventory">
                    <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="az">Name A-Z</option><option value="za">Name Z-A</option><option value="value-hi">Value high to low</option><option value="value-lo">Value low to high</option>
                </select>
                <select value={filters.category} onChange={(event) => onFilterChange('category', event.target.value as InventoryFilters['category'])} aria-label="Filter by category">
                    <option value="">All categories</option>{CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
                <select value={filters.room} onChange={(event) => onFilterChange('room', event.target.value)} aria-label="Filter by room">
                    <option value="">All rooms</option>{rooms.map((room) => <option key={room} value={room}>{room}</option>)}
                </select>
                <button type="button" className="clear-filters-button" onClick={onClearFilters} disabled={!hasActiveFilters} aria-label="Clear filters" title="Clear filters"><X size={17} /></button>
            </div>
            <div className="tag-toolbar-row">
                {tags.length > 0 ? <div className="tag-row">{tags.map((tag) => <button key={tag} className={filters.tags.includes(tag) ? 'tag active' : 'tag'} onClick={() => onFilterChange('tags', filters.tags.includes(tag) ? filters.tags.filter((current) => current !== tag) : [...filters.tags, tag])}>#{tag}</button>)}</div> : <span />}
                <div className="view-toggle"><button className={view === 'grid' ? 'active' : ''} onClick={() => onViewChange('grid')} aria-label="Grid view" title="Grid view"><Grid2X2 size={17} /></button><button className={view === 'list' ? 'active' : ''} onClick={() => onViewChange('list')} aria-label="List view" title="List view"><List size={17} /></button></div>
            </div>
        </>
    );
}
