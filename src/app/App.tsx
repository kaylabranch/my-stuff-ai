import { useEffect, useMemo, useRef, useState } from 'react';
import { type InventoryFilters, type InventoryItem } from '../types/inventory';
import { filterAndSortInventory } from '../lib/filtering/inventoryFilters';
import { useInventory } from '../hooks/useInventory';
import '../styles/globals.css';
import { analyzeImageWithGemini } from '../lib/ai/geminiProvider';
import { cropImageToBlob } from '../lib/images/cropImage';
import { itemsRepository } from '../lib/db/database';
import { DetectionReviewModal, type ReviewItem } from '../components/detection/DetectionReviewModal';
import { TopBar } from '../components/layout/TopBar';
import { StatsRow } from '../components/inventory/StatsRow';
import { InventorySection } from '../components/inventory/InventorySection';
import { WorkspaceIntro } from '../components/layout/WorkspaceIntro';
import { AnalysisProgress } from '../components/feedback/AnalysisProgress';
import type { AnalysisProgress as AnalysisProgressUpdate } from '../lib/ai/geminiProvider';

const initialFilters: InventoryFilters = { query: '', category: '', tags: [], sort: 'newest' };

export function App() {
    const { items, isLoading, error, reload } = useInventory();
    const [filters, setFilters] = useState(initialFilters);
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);
    const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgressUpdate | null>(null);
    const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
    const [reviewFile, setReviewFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const visibleItems = useMemo(() => filterAndSortInventory(items, filters), [items, filters]);
    const categories = [...new Set(items.map((item) => item.category))].sort();
    const tags = [...new Set(items.flatMap((item) => item.tags))].sort();
    const updateFilter = <Key extends keyof InventoryFilters>(key: Key, value: InventoryFilters[Key]) =>
        setFilters((current) => ({ ...current, [key]: value }));

    useEffect(() => {
        if (analysisProgress?.phase !== 'analyzing') return;
        const interval = window.setInterval(() => {
            setAnalysisProgress((current) => {
                if (!current || current.phase !== 'analyzing' || current.progress >= 85) return current;
                return { ...current, progress: Math.min(85, current.progress + 1) };
            });
        }, 450);
        return () => window.clearInterval(interval);
    }, [analysisProgress?.phase]);

    const updateReviewItem = (index: number, changes: Partial<ReviewItem>) => {
        setReviewItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item));
    };

    const closeReview = () => {
        setReviewFile(null);
        setReviewItems([]);
        setAnalysisStatus(null);
        setAnalysisProgress(null);
    };

    return (
        <main className="app-shell">
            <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/heic,image/heif" onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setAnalysisStatus(null);
                setAnalysisProgress({ phase: 'reading', progress: 0 });
                void analyzeImageWithGemini(file, (update) => {
                    setAnalysisProgress((current) => update.phase === 'reading'
                        ? { phase: 'reading', progress: Math.min(30, 5 + update.progress * 0.25) }
                        : update);
                }).then(async (detected) => {
                    await new Promise((resolve) => window.setTimeout(resolve, 300));
                    setReviewFile(file);
                    setReviewItems(detected.map((item) => ({ ...item, removed: false })));
                    setAnalysisStatus(`${detected.length} object${detected.length === 1 ? '' : 's'} detected. Review each item before saving.`);
                    setAnalysisProgress(null);
                }).catch((caught: unknown) => { setAnalysisProgress(null); setAnalysisStatus(caught instanceof Error ? caught.message : 'Image analysis failed.'); });
                event.target.value = '';
            }} />
            <TopBar itemCount={items.length} />

            <WorkspaceIntro onUpload={() => fileInputRef.current?.click()} />

            {analysisProgress && <AnalysisProgress label={analysisProgress.phase === 'reading' ? 'Reading image...' : analysisProgress.phase === 'parsing' ? 'Parsing detected objects...' : analysisProgress.progress >= 80 ? 'Gemini is finishing analysis...' : 'Gemini is analyzing the image...'} progress={analysisProgress.progress} />}
            {analysisStatus && !analysisProgress && <p className="analysis-status" role="status">{analysisStatus}</p>}

            <StatsRow itemCount={items.length} categoryCount={categories.length} tagCount={tags.length} estimatedValue={items.reduce((total, item) => total + item.estimatedValue, 0)} />

            <InventorySection items={items} visibleItems={visibleItems} filters={filters} tags={tags} view={view} isLoading={isLoading} error={error} onFilterChange={updateFilter} onViewChange={setView} />

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