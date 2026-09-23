import { useMemo, useRef, useState } from 'react';
import { Camera, Grid2X2, List, Search, Upload } from 'lucide-react';
import { CATEGORIES, type InventoryFilters, type InventoryItem } from '../types/inventory';
import { filterAndSortInventory } from '../lib/filtering/inventoryFilters';
import { useInventory } from '../hooks/useInventory';
import '../styles/globals.css';
import { analyzeImageWithGemini } from '../lib/ai/geminiProvider';
import { cropImageToBlob } from '../lib/images/cropImage';
import { itemsRepository } from '../lib/db/database';
import { DetectionReviewModal, type ReviewItem } from '../components/detection/DetectionReviewModal';

const initialFilters: InventoryFilters = { query: '', category: '', tags: [], sort: 'newest' };

export function App() {
    const { items, isLoading, error, reload } = useInventory();
    const [filters, setFilters] = useState(initialFilters);
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);
    const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
    const [reviewFile, setReviewFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const visibleItems = useMemo(() => filterAndSortInventory(items, filters), [items, filters]);
    const categories = [...new Set(items.map((item) => item.category))].sort();
    const tags = [...new Set(items.flatMap((item) => item.tags))].sort();
    const updateFilter = <Key extends keyof InventoryFilters>(key: Key, value: InventoryFilters[Key]) =>
        setFilters((current) => ({ ...current, [key]: value }));

    const updateReviewItem = (index: number, changes: Partial<ReviewItem>) => {
        setReviewItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item));
    };

    const closeReview = () => {
        setReviewFile(null);
        setReviewItems([]);
    };

    return (
        <main className="app-shell">
            <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/heic,image/heif" onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setAnalysisStatus('Analyzing with Gemini...');
                void analyzeImageWithGemini(file).then((detected) => {
                    setReviewFile(file);
                    setReviewItems(detected.map((item) => ({ ...item, removed: false })));
                    setAnalysisStatus(`${detected.length} object${detected.length === 1 ? '' : 's'} detected. Review each item before saving.`);
                }).catch((caught: unknown) => setAnalysisStatus(caught instanceof Error ? caught.message : 'Image analysis failed.'));
                event.target.value = '';
            }} />
            <header className="topbar">
                <div className="brand"><span>My Stuff</span><b>AI</b></div>
                <span className="item-count">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
            </header>

            <section className="workspace-intro">
                <div>
                    <p className="eyebrow">Personal inventory</p>
                    <h1>Log what you own.</h1>
                    <p className="intro-copy">My Stuff AI will turn your photos into a searchable inventory.</p>
                </div>
                <button className="upload-button" type="button" onClick={() => fileInputRef.current?.click()}><Upload size={17} /> Upload a photo</button>
            </section>
            {analysisStatus && <p className="analysis-status" role="status">{analysisStatus}</p>}

            <section className="stats-row" aria-label="Inventory statistics">
                <div><strong>{items.length}</strong><span>Total items</span></div>
                <div><strong>{categories.length}</strong><span>Categories</span></div>
                <div><strong>{tags.length}</strong><span>Tags used</span></div>
                <div className="accent-stat"><strong>${items.reduce((total, item) => total + item.estimatedValue, 0).toLocaleString()}</strong><span>Estimated value</span></div>
            </section>

            <section className="inventory-section">
                <div className="toolbar">
                    <label className="search-field"><Search size={17} /><span className="visually-hidden">Search inventory</span><input value={filters.query} onChange={(event) => updateFilter('query', event.target.value)} placeholder="Search your inventory" /></label>
                    <select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value as InventoryFilters['sort'])} aria-label="Sort inventory">
                        <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="az">Name A-Z</option><option value="za">Name Z-A</option><option value="value-hi">Value high to low</option><option value="value-lo">Value low to high</option>
                    </select>
                    <select value={filters.category} onChange={(event) => updateFilter('category', event.target.value as InventoryFilters['category'])} aria-label="Filter by category">
                        <option value="">All categories</option>{CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                    <div className="view-toggle"><button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} aria-label="Grid view"><Grid2X2 size={17} /></button><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} aria-label="List view"><List size={17} /></button></div>
                </div>

                {tags.length > 0 && <div className="tag-row">{tags.map((tag) => <button key={tag} className={filters.tags.includes(tag) ? 'tag active' : 'tag'} onClick={() => updateFilter('tags', filters.tags.includes(tag) ? filters.tags.filter((current) => current !== tag) : [...filters.tags, tag])}>#{tag}</button>)}</div>}

                {error && <p className="error-message">{error}</p>}
                {isLoading ? <div className="empty-state"><Camera size={28} /><h2>Loading your inventory</h2></div> : visibleItems.length === 0 ? <div className="empty-state"><Camera size={32} /><h2>{items.length === 0 ? 'Your inventory is empty' : 'No items match your filters'}</h2><p>{items.length === 0 ? 'Upload a room photo to get started.' : 'Try adjusting your search or filters.'}</p></div> : <div className={view === 'grid' ? 'inventory-grid' : 'inventory-list'}>{visibleItems.map((item) => <article className="item-card" key={item.id}><div className="image-placeholder"><Camera size={22} /></div><div><p className="item-category">{item.category}</p><h2>{item.name}</h2><p>{item.description}</p></div></article>)}</div>}
            </section>
            {reviewFile && <DetectionReviewModal
                file={reviewFile}
                items={reviewItems}
                isSaving={isSaving}
                onChange={updateReviewItem}
                onToggleRemoved={(index) => setReviewItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, removed: !item.removed } : item))}
                onClose={closeReview}
                onSave={async () => {
                    setIsSaving(true);
                    const eligible = reviewItems.filter((item) => !item.removed && item.name.trim());
                    let savedCount = 0;
                    try {
                        for (const item of eligible) {
                            let imageBlob: Blob;
                            try { imageBlob = await cropImageToBlob(reviewFile, item.bbox); } catch { imageBlob = reviewFile; }
                            const record: InventoryItem = { id: `item_${Date.now()}_${Math.random().toString(36).slice(2)}`, name: item.name.trim(), category: item.category, description: item.description.trim(), tags: item.suggestedTags, imageBlob, estimatedValue: item.estimatedValue, createdAt: Date.now() };
                            await itemsRepository.put(record);
                            savedCount += 1;
                        }
                        await reload();
                        closeReview();
                        setAnalysisStatus(`${savedCount} item${savedCount === 1 ? '' : 's'} saved to your inventory.`);
                    } catch {
                        setAnalysisStatus(`${savedCount} item${savedCount === 1 ? '' : 's'} saved. Some items could not be saved.`);
                        await reload();
                    } finally {
                        setIsSaving(false);
                    }
                }}
            />}
        </main>
    );
}