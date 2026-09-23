import { Download, FileText, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { InventoryItem } from '../../types/inventory';
import { buildInventoryPdf, type PdfOptions } from '../../lib/pdf/inventoryPdf';

interface ExportPdfModalProps {
    items: InventoryItem[];
    onClose: () => void;
}

const defaultOptions: PdfOptions = { title: 'My Home Inventory', includeSummary: true, includeImages: true, includeValues: true, includeTags: true };

export function ExportPdfModal({ items, onClose }: ExportPdfModalProps) {
    const [options, setOptions] = useState(defaultOptions);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

    useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);

    const updateOption = <Key extends keyof PdfOptions>(key: Key, value: PdfOptions[Key]) => setOptions((current) => ({ ...current, [key]: value }));

    const generate = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            const blob = await buildInventoryPdf(items, options);
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
            setPdfBlob(blob);
            setPdfUrl(URL.createObjectURL(blob));
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'The PDF could not be generated.');
        } finally {
            setIsGenerating(false);
        }
    };

    if (pdfUrl) return <div className="export-overlay"><section className="pdf-viewer" role="dialog" aria-modal="true" aria-labelledby="pdf-title"><div className="pdf-viewer-header"><div><p className="eyebrow">Export ready</p><h2 id="pdf-title">{options.title}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close PDF preview"><X size={18} /></button></div><iframe title="Inventory PDF preview" src={pdfUrl} /><div className="pdf-viewer-actions"><button className="secondary-button" type="button" onClick={() => setPdfUrl(null)}>Back to options</button><button className="upload-button" type="button" onClick={() => { if (!pdfBlob) return; const downloadUrl = URL.createObjectURL(pdfBlob); const link = document.createElement('a'); link.href = downloadUrl; link.download = `${options.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`; link.click(); URL.revokeObjectURL(downloadUrl); }}><Download size={17} /> Download PDF</button></div></section></div>;

    return <div className="export-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="export-modal" role="dialog" aria-modal="true" aria-labelledby="export-title"><div className="edit-header"><div><p className="eyebrow">Entire inventory</p><h2 id="export-title">Export to PDF</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close export dialog"><X size={18} /></button></div><p className="export-count"><FileText size={16} /> {items.length} {items.length === 1 ? 'item' : 'items'} will be included</p><label className="export-title-field">Report title<input value={options.title} onChange={(event) => updateOption('title', event.target.value)} /></label><div className="export-options"><label><input type="checkbox" checked={options.includeSummary} onChange={(event) => updateOption('includeSummary', event.target.checked)} /> Summary and category totals</label><label><input type="checkbox" checked={options.includeImages} onChange={(event) => updateOption('includeImages', event.target.checked)} /> Item photos</label><label><input type="checkbox" checked={options.includeValues} onChange={(event) => updateOption('includeValues', event.target.checked)} /> Estimated values</label><label><input type="checkbox" checked={options.includeTags} onChange={(event) => updateOption('includeTags', event.target.checked)} /> Tags</label></div>{error && <p className="error-message">{error}</p>}<div className="edit-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="upload-button" type="button" disabled={isGenerating || items.length === 0} onClick={() => void generate()}><FileText size={17} /> {isGenerating ? 'Generating...' : 'Generate PDF'}</button></div></section></div>;
}
