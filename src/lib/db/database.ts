import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { InventoryItem } from '../../types/inventory';

interface MyStuffSchema extends DBSchema {
    items: {
        key: string;
        value: InventoryItem;
        indexes: { 'by-category': string; 'by-created-at': number };
    };
}

let databasePromise: Promise<IDBPDatabase<MyStuffSchema>> | undefined;

function getDatabase() {
    databasePromise ??= openDB<MyStuffSchema>('my-stuff-ai', 1, {
        upgrade(database) {
            const store = database.createObjectStore('items', { keyPath: 'id' });
            store.createIndex('by-category', 'category');
            store.createIndex('by-created-at', 'createdAt');
        },
    });
    return databasePromise;
}

export const itemsRepository = {
    async list() {
        return (await getDatabase()).getAll('items');
    },
    async put(item: InventoryItem) {
        await (await getDatabase()).put('items', item);
    },
    async delete(id: string) {
        await (await getDatabase()).delete('items', id);
    },
    async clear() {
        await (await getDatabase()).clear('items');
    },
};