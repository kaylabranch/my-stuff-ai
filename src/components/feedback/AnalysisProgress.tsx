interface AnalysisProgressProps {
    label: string;
    progress: number;
}

export function AnalysisProgress({ label, progress }: AnalysisProgressProps) {
    return (
        <div className="analysis-status" role="status" aria-live="polite">
            <div className="analysis-status-header"><span>{label}</span><span>{Math.round(progress)}%</span></div>
            <div className="analysis-progress-track"><span style={{ width: `${progress}%` }} /></div>
        </div>
    );
}
