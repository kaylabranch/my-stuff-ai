/** Estimated values are null when unknown; legacy records stored 0 for "no value", so 0 counts as unknown too. */
export function hasValue(value: number | null | undefined): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/** Formats a value as "$1,234", or returns null when there is no value to show. */
export function formatValue(value: number | null | undefined): string | null {
    return hasValue(value) ? `$${value.toLocaleString()}` : null;
}

/** Sums the known values; null when no item has one. */
export function sumValues(items: ReadonlyArray<{ estimatedValue: number | null }>): number | null {
    const known = items.map((item) => item.estimatedValue).filter(hasValue);
    return known.length ? known.reduce((total, value) => total + value, 0) : null;
}

/** Converts a form input to a stored value: blank, invalid, or non-positive input becomes null. */
export function parseValueInput(raw: FormDataEntryValue | string | null): number | null {
    const parsed = Number(raw);
    return typeof raw === 'string' && raw.trim() && hasValue(parsed) ? parsed : null;
}

/** Sort comparator for value order; items without a value always sort last. */
export function compareValues(
    first: number | null | undefined,
    second: number | null | undefined,
    direction: 'desc' | 'asc',
): number {
    const firstKnown = hasValue(first);
    const secondKnown = hasValue(second);
    if (!firstKnown || !secondKnown) return Number(secondKnown) - Number(firstKnown);
    return direction === 'desc' ? second - first : first - second;
}
