import { describe, expect, it } from 'vitest';
import { compareValues, formatValue, hasValue, parseValueInput, sumValues } from '../../src/lib/inventory/itemValue';

describe('hasValue', () => {
    it('treats only positive finite numbers as a value (null, undefined, and legacy 0 are unknown)', () => {
        expect([80, 0.5].every((value) => hasValue(value))).toBe(true);
        expect([null, undefined, 0, -1, Number.NaN, Infinity].some((value) => hasValue(value))).toBe(false);
    });
});

describe('formatValue', () => {
    it('formats known values and returns null for unknown ones', () => {
        expect(formatValue(1234)).toBe('$1,234');
        expect(formatValue(null)).toBeNull();
        expect(formatValue(0)).toBeNull();
    });
});

describe('sumValues', () => {
    it('adds known values and ignores unknown ones', () => {
        expect(sumValues([{ estimatedValue: 10 }, { estimatedValue: null }, { estimatedValue: 5 }])).toBe(15);
    });

    it('returns null when no item has a value, including an empty list', () => {
        expect(sumValues([{ estimatedValue: null }, { estimatedValue: 0 }])).toBeNull();
        expect(sumValues([])).toBeNull();
    });
});

describe('parseValueInput', () => {
    it('parses positive numbers and returns null for blank, invalid, or non-positive input', () => {
        expect(parseValueInput('12.5')).toBe(12.5);
        for (const raw of ['', '   ', 'abc', '0', '-3', null]) expect(parseValueInput(raw)).toBeNull();
    });
});

describe('compareValues', () => {
    const sorted = (values: Array<number | null>, direction: 'desc' | 'asc') =>
        [...values].sort((first, second) => compareValues(first, second, direction));

    it('sorts known values in either direction with unknown values always last', () => {
        const values = [null, 20, 0, 50, null, 5];
        expect(sorted(values, 'desc')).toEqual([50, 20, 5, null, 0, null]);
        expect(sorted(values, 'asc').slice(0, 3)).toEqual([5, 20, 50]);
        expect(sorted(values, 'asc').slice(3).every((value) => !hasValue(value))).toBe(true);
    });
});
