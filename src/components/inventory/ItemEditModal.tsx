import type { FormEvent } from 'react';
import { Save, X } from 'lucide-react';
import { CATEGORIES, type InventoryItem } from '../../types/inventory';

interface ItemEditModalProps {
    item: InventoryItem;
    isSaving: boolean;
    onSave: (changes: Pick<InventoryItem, 'name' | 'category' | 'description' | 'tags' | 'estimatedValue'>) => void;
    onClose: () => void;
}

export function ItemEditModal({ item, isSaving, onSave, onClose }: ItemEditModalProps) {
    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        onSave({
            name: String(form.get('name') || '').trim() || item.name,
            category: String(form.get('category')) as InventoryItem['category'],
            description: String(form.get('description') || '').trim(),
            tags: String(form.get('tags') || '').split(',').map((tag) => tag.trim()).filter(Boolean),
            estimatedValue: Math.max(0, Number(form.get('estimatedValue')) || 0),
        });
    };

    return (
        <div className="edit-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <section className="edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-title">
                <div className="edit-header"><div><p className="eyebrow">Inventory item</p><h2 id="edit-title">Edit item</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close edit dialog" title="Close"><X size={18} /></button></div>
                <form className="edit-form" onSubmit={handleSubmit}>
                    <label>Name<input name="name" defaultValue={item.name} required /></label>
                    <label>Category<select name="category" defaultValue={item.category}>{CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
                    <label>Description<textarea name="description" defaultValue={item.description} rows={3} /></label>
                    <label>Tags<input name="tags" defaultValue={item.tags.join(', ')} placeholder="tags, comma separated" /></label>
                    <label>Estimated value ($)<input name="estimatedValue" type="number" min="0" step="0.01" defaultValue={item.estimatedValue || ''} /></label>
                    <div className="edit-actions"><button className="secondary-button" type="button" onClick={onClose} title="Cancel">Cancel</button><button className="upload-button" type="submit" disabled={isSaving} title="Save changes"><Save size={17} /> {isSaving ? 'Saving...' : 'Save changes'}</button></div>
                </form>
            </section>
        </div>
    );
}
