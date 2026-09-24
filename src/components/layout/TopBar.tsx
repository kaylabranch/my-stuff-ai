import { FileText, Trash2 } from 'lucide-react';

interface TopBarProps {
    itemCount: number;
    onClear: () => void;
    onExport: () => void;
}

export function TopBar({ itemCount, onClear, onExport }: TopBarProps) {
    return (
        <header className="topbar">
            <div className="brand"><span>My Stuff</span><b>AI</b></div>
            <div className="topbar-actions"><span className="item-count">{itemCount} {itemCount === 1 ? 'item' : 'items'} total</span><button className="topbar-icon-button download" type="button" onClick={onExport} disabled={itemCount === 0} aria-label="Export inventory to PDF" title="Export PDF"><FileText size={17} /></button><button className="topbar-icon-button clear" type="button" onClick={onClear} disabled={itemCount === 0} aria-label="Clear inventory" title="Clear inventory"><Trash2 size={17} /></button></div>
        </header>
    );
}
