import { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';

interface InventoryImageProps {
    blob?: Blob;
    alt: string;
}

export function InventoryImage({ blob, alt }: InventoryImageProps) {
    const [source, setSource] = useState<string | null>(null);

    useEffect(() => {
        if (!blob) {
            setSource(null);
            return;
        }
        const objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [blob]);

    if (!source) return <Camera size={22} />;
    return <img className="inventory-image" src={source} alt={alt} onError={() => setSource(null)} />;
}
