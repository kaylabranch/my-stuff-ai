import { Upload } from 'lucide-react';

interface WorkspaceIntroProps {
    onUpload: () => void;
}

export function WorkspaceIntro({ onUpload }: WorkspaceIntroProps) {
    return (
        <section className="workspace-intro">
            <div>
                <p className="eyebrow">Personal inventory</p>
                <h1>Log what you own.</h1>
                <p className="intro-copy">My Stuff AI will turn your photos into an interactive inventory.</p>
            </div>
            <button className="upload-button" type="button" onClick={onUpload}><Upload size={17} /> Upload a photo</button>
        </section>
    );
}
