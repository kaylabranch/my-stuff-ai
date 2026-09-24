import { useCallback, useEffect, useState } from 'react';
import { itemsRepository } from '../lib/db/database';
import type { InventoryItem } from '../types/inventory';

export function useInventory() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        setIsLoading(true);
        try {
            setItems(await itemsRepository.list());
            setError(null);
        } catch {
            setError('Your inventory could not be loaded.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void reload();
    }, [reload]);

    return { items, isLoading, error, reload };
}
