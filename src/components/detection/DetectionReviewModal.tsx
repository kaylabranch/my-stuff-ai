import { useEffect, useState } from 'react';
import { Camera, Save, Trash2, Upload, X } from 'lucide-react';
import { CATEGORIES, type DetectedItem } from '../../types/inventory';
import { cropImageToBlob } from '../../lib/images/cropImage';

export type ReviewItem = DetectedItem & { removed: boolean };

interface DetectionReviewModalProps {
    file: File;
    items: ReviewItem[];
    isSaving: boolean;
    onChange: (index: number, changes: Partial<ReviewItem>) => void;
    onToggleRemoved: (index: number) => void;
    onClose: () => void;
    onSave: () => void;
}

export function DetectionReviewModal({ file, items, isSaving, onChange, onToggleRemoved, onClose, onSave }: DetectionReviewModalProps) {
    const [sourceUrl, setSourceUrl] = useState<string | null>(null);
    const [thumbUrls, setThumbUrls] = useState<Array<string | null>>([]);

    useEffect(() => {
        const nextSourceUrl = URL.createObjectURL(file);
        let cancelled = false;
        const createdThumbUrls: string[] = [];
        setSourceUrl(nextSourceUrl);
        setThumbUrls([]);

        void Promise.all(items.map(async (item) => {
            try {
                const blob = await cropImageToBlob(file, item.bbox);
                const url = URL.createObjectURL(blob);
                createdThumbUrls.push(url);
                return url;
            } catch {
                return null;
            }
        })).then((urls) => {
            if (cancelled) {
                createdThumbUrls.forEach((url) => URL.revokeObjectURL(url));
                return;
            }
            setThumbUrls(urls);
        });

        return () => {
            cancelled = true;
            URL.revokeObjectURL(nextSourceUrl);
            createdThumbUrls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [file, items]);

    const eligibleCount = items.filter((item) => !item.removed && item.name.trim()).length;

    return (
        <div className="review-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <section className="review-modal" role="dialog" aria-modal="true" aria-labelledby="review-title">
                <div className="review-header">
                    <div><p className="eyebrow">Detection review</p><h2 id="review-title">Review {items.filter((item) => !item.removed).length} eligible objects</h2></div>
                    <button className="icon-button" type="button" onClick={onClose} aria-label="Close review" title="Close"><X size={18} /></button>
                </div>
                {sourceUrl && <div className="review-source"><img className='source-image' src={sourceUrl} alt="Uploaded room" /></div>}
                <div className="review-list">
                    {items.map((item, index) => <div className={item.removed ? 'review-item removed' : 'review-item'} key={`${item.name}-${index}`}>
                        <div className="review-thumb">{thumbUrls[index] ? <img src={thumbUrls[index] || undefined} alt={`Crop of ${item.name}`} /> : <Camera size={20} />}<span title="AI Confidence Score">{Math.round(item.confidence * 100)}%</span></div>
                        <div className="review-fields">
                            <input aria-label={`Object ${index + 1} name`} value={item.name} onChange={(event) => onChange(index, { name: event.target.value })} />
                            <div className="review-controls">
                                <select aria-label={`Object ${index + 1} category`} value={item.category} onChange={(event) => onChange(index, { category: event.target.value as DetectedItem['category'] })}>{CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select>
                                <input aria-label={`Object ${index + 1} tags`} value={item.suggestedTags.join(', ')} placeholder="tags, comma separated" onChange={(event) => onChange(index, { suggestedTags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} />
                            </div>
                            <textarea aria-label={`Object ${index + 1} description`} value={item.description} rows={2} onChange={(event) => onChange(index, { description: event.target.value })} />
                            <label className="review-value"><span>Est. value</span><span className="currency-input"><span>$</span><input aria-label={`Object ${index + 1} estimated value`} type="number" min="0" step="0.01" value={item.estimatedValue || ''} placeholder="0.00" onChange={(event) => onChange(index, { estimatedValue: Math.max(0, Number(event.target.value) || 0) })} /></span></label>
                        </div>
                        <button className="icon-button danger" type="button" onClick={() => onToggleRemoved(index)} aria-label={item.removed ? `Restore ${item.name}` : `Remove ${item.name}`} title={item.removed ? 'Restore item' : 'Remove item'}>{item.removed ? <Upload size={17} /> : <Trash2 size={17} />}</button>
                    </div>)}
                </div>
                <div className="review-footer">
                    <button className="secondary-button" type="button" onClick={onClose} title="Discard this batch">Discard</button>
                    <button className="upload-button" type="button" disabled={isSaving || eligibleCount === 0} onClick={onSave} title="Save eligible items"><Save size={17} /> {isSaving ? 'Saving...' : `Save ${eligibleCount} items`}</button>
                </div>
            </section>
        </div>
    );
}
