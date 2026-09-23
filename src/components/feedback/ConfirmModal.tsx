import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
    title: string;
    message: string;
    confirmLabel: string;
    isBusy?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmModal({ title, message, confirmLabel, isBusy = false, onConfirm, onCancel }: ConfirmModalProps) {
    return (
        <div className="confirm-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
            <section className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
                <button className="icon-button confirm-close" type="button" onClick={onCancel} aria-label="Cancel"><X size={18} /></button>
                <div className="confirm-icon"><AlertTriangle size={22} /></div>
                <h2 id="confirm-title">{title}</h2>
                <p>{message}</p>
                <div className="confirm-actions"><button className="secondary-button" type="button" onClick={onCancel} disabled={isBusy}>Cancel</button><button className="danger-button" type="button" onClick={onConfirm} disabled={isBusy}>{isBusy ? 'Deleting...' : confirmLabel}</button></div>
            </section>
        </div>
    );
}
