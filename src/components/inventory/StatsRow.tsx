import { formatValue } from '../../lib/inventory/itemValue';

interface StatsRowProps {
    itemCount: number;
    categoryCount: number;
    roomCount: number;
    tagCount: number;
    estimatedValue: number | null;
}

export function StatsRow({ itemCount, categoryCount, roomCount, tagCount, estimatedValue }: StatsRowProps) {
    return (
        <section className="stats-row" aria-label="Inventory statistics">
            <div>
                <strong>{itemCount}</strong>
                <span>Total items</span>
            </div>
            <div>
                <strong>{categoryCount}</strong>
                <span>Categories</span>
            </div>
            <div>
                <strong>{roomCount}</strong>
                <span>Room(s)</span>
            </div>
            <div>
                <strong>{tagCount}</strong>
                <span>Tags used</span>
            </div>
            <div className="accent-stat">
                <strong>{formatValue(estimatedValue) ?? '—'}</strong>
                <span>Estimated value</span>
            </div>
        </section>
    );
}
