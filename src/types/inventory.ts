export const CATEGORIES = [
    'Furniture',
    'Electronics',
    'Appliances',
    'Decor',
    'Lighting',
    'Clothing',
    'Books & Media',
    'Kitchenware',
    'Tools',
    'Sports',
    'Art',
    'Plants',
    'Toys',
    'Storage',
    'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface InventoryItem {
    id: string;
    name: string;
    category: Category;
    description: string;
    tags: string[];
    room: string;
    imageBlob?: Blob;
    /** Null when unknown. */
    estimatedValue: number | null;
    createdAt: number;
}

export interface InventoryFilters {
    query: string;
    category: Category | '';
    room: string;
    tags: string[];
    sort: 'az' | 'za' | 'category' | 'value-hi' | 'value-lo';
}

export interface BoundingBox {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface DetectedItem {
    name: string;
    category: Category;
    description: string;
    suggestedTags: string[];
    confidence: number;
    bbox: BoundingBox;
    /** Null when the model could not judge a value. */
    estimatedValue: number | null;
}
