export const CATEGORIES = [
    'Furniture', 'Electronics', 'Appliances', 'Decor', 'Lighting',
    'Clothing', 'Books & Media', 'Kitchenware', 'Tools', 'Sports',
    'Art', 'Plants', 'Toys', 'Storage', 'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface InventoryItem {
    id: string;
    name: string;
    category: Category;
    description: string;
    tags: string[];
    imageBlob?: Blob;
    estimatedValue: number;
    createdAt: number;
}

export interface InventoryFilters {
    query: string;
    category: Category | '';
    tags: string[];
    sort: 'newest' | 'oldest' | 'az' | 'za' | 'category' | 'value-hi' | 'value-lo';
}