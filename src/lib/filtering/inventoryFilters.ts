import type { InventoryFilters, InventoryItem } from '../../types/inventory';

export function filterAndSortInventory(items: InventoryItem[], filters: InventoryFilters): InventoryItem[] {
    const query = filters.query.trim().toLowerCase();
    const result = items.filter((item) => {
        const matchesQuery = !query || [item.name, item.description, ...item.tags]
            .some((value) => value.toLowerCase().includes(query));
        const matchesCategory = !filters.category || item.category === filters.category;
        const matchesRoom = !filters.room || item.room === filters.room;
        const matchesTags = filters.tags.every((tag) => item.tags.includes(tag));
        return matchesQuery && matchesCategory && matchesRoom && matchesTags;
    });

    return result.sort((first, second) => {
        switch (filters.sort) {
            case 'za': return second.name.localeCompare(first.name);
            case 'category': return first.category.localeCompare(second.category);
            case 'value-hi': return second.estimatedValue - first.estimatedValue;
            case 'value-lo': return first.estimatedValue - second.estimatedValue;
            case 'az':
            default: return first.name.localeCompare(second.name);
        }
    });
}