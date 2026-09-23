import { jsPDF } from 'jspdf';
import type { InventoryItem } from '../../types/inventory';

export interface PdfOptions {
    title: string;
    includeSummary: boolean;
    includeImages: boolean;
    includeValues: boolean;
    includeTags: boolean;
}

export async function buildInventoryPdf(items: InventoryItem[], options: PdfOptions): Promise<Blob> {
    const document = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    const ink: [number, number, number] = [33, 30, 26];
    const muted: [number, number, number] = [131, 125, 116];
    const accent: [number, number, number] = [181, 107, 41];
    const pale: [number, number, number] = [255, 247, 228];
    let y = 28;

    const font = (style: 'normal' | 'bold', size: number, color: [number, number, number] = ink) => {
        document.setFont('helvetica', style);
        document.setFontSize(size);
        document.setTextColor(...color);
    };
    const rule = () => {
        document.setDrawColor(223, 217, 205);
        document.setLineWidth(.25);
        document.line(margin, y, pageWidth - margin, y);
    };
    const ensureSpace = (height: number) => {
        if (y + height > pageHeight - 18) {
            document.addPage();
            y = 22;
            document.setFillColor(...accent);
            document.rect(0, 0, pageWidth, 3, 'F');
            return true;
        }
        return false;
    };

    document.setFillColor(...accent);
    document.rect(0, 0, pageWidth, 6, 'F');
    font('bold', 25);
    document.text(options.title || 'My Home Inventory', margin, y);
    y += 8;
    font('normal', 9, muted);
    document.text(`Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, y);
    y += 7;
    rule();
    y += 10;

    const totalValue = items.reduce((sum, item) => sum + item.estimatedValue, 0);
    const categoryCount = new Set(items.map((item) => item.category)).size;
    const tagCount = new Set(items.flatMap((item) => item.tags)).size;
    const statValues = [
        ['Items', String(items.length)],
        ['Categories', String(categoryCount)],
        ['Tags', String(tagCount)],
        ...(options.includeValues ? [['Estimated value', `$${totalValue.toLocaleString()}`]] : []),
    ];
    const statWidth = contentWidth / statValues.length;
    statValues.forEach(([label, value], index) => {
        const x = margin + index * statWidth;
        document.setFillColor(...pale);
        document.roundedRect(x, y, statWidth - 4, 18, 2, 2, 'F');
        font('bold', 13, index === statValues.length - 1 && options.includeValues ? accent : ink);
        document.text(value, x + (statWidth - 4) / 2, y + 8, { align: 'center' });
        font('normal', 6.5, muted);
        document.text(label.toUpperCase(), x + (statWidth - 4) / 2, y + 13, { align: 'center' });
    });
    y += 27;

    if (options.includeSummary) {
        font('bold', 12);
        document.text('By category', margin, y);
        y += 6;
        rule();
        y += 5;
        font('bold', 8, muted);
        document.text('Category', margin, y);
        document.text('Items', margin + 92, y);
        if (options.includeValues) document.text('Estimated value', margin + 126, y);
        y += 5;
        [...new Set(items.map((item) => item.category))].sort().forEach((category) => {
            ensureSpace(8);
            const categoryItems = items.filter((item) => item.category === category);
            const categoryValue = categoryItems.reduce((sum, item) => sum + item.estimatedValue, 0);
            font('normal', 8.5);
            document.text(category, margin, y);
            document.text(String(categoryItems.length), margin + 92, y);
            if (options.includeValues) {
                font('normal', 8.5, accent);
                document.text(`$${categoryValue.toLocaleString()}`, margin + 126, y);
            }
            y += 6;
        });
        y += 7;
    }

    document.addPage();
    y = 22;
    document.setFillColor(...accent);
    document.rect(0, 0, pageWidth, 3, 'F');
    font('bold', 14);
    document.text('Inventory items', margin, y);
    y += 8;
    rule();
    y += 7;

    for (const [index, item] of items.entries()) {
        const rowHeight = options.includeImages ? 30 : 18;
        ensureSpace(rowHeight + 4);
        if (index % 2 === 0) {
            document.setFillColor(250, 248, 243);
            document.rect(margin - 2, y - 4, contentWidth + 4, rowHeight, 'F');
        }
        let x = margin;
        if (options.includeImages && item.imageBlob) {
            const image = await blobToDataUrl(item.imageBlob);
            if (image) {
                try { document.addImage(image, 'JPEG', x, y - 2, 24, 24, undefined, 'FAST'); } catch { /* image fallback */ }
            }
            x += 29;
        }
        const valueOffset = options.includeValues ? 34 : 0;
        font('bold', 9);
        document.text(item.name || 'Unnamed item', x, y + 3);
        font('normal', 7.5, muted);
        document.text(item.category, x, y + 8);
        if (item.description) {
            font('normal', 7, muted);
            document.text(document.splitTextToSize(item.description, contentWidth - (x - margin) - valueOffset - 4).slice(0, 2), x, y + 13);
        }
        if (options.includeTags && item.tags.length) {
            font('normal', 6.5, accent);
            document.text(item.tags.slice(0, 5).map((tag) => `#${tag}`).join('  '), x, y + (item.description ? 22 : 14));
        }
        if (options.includeValues) {
            font('bold', 9, accent);
            document.text(`$${item.estimatedValue.toLocaleString()}`, pageWidth - margin, y + 3, { align: 'right' });
        }
        y += rowHeight + 3;
    }

    const totalPages = document.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
        document.setPage(page);
        font('normal', 7, muted);
        document.text(`${page} / ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    }
    return document.output('blob');
}

function blobToDataUrl(blob: Blob): Promise<string | null> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
    });
}
