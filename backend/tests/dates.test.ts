import { describe, expect, it } from 'vitest';
import { monthRange, periodRange, DAY_MS } from '../src/utils/dates.js';
describe('UTC date windows', () => {
  it('includes today and six previous days across a year boundary', () => {
    const range = periodRange('weekly', new Date('2026-01-02T14:00:00Z'));
    expect(range.start.toISOString()).toBe('2025-12-27T00:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-01-02T14:00:00.000Z');
  });
  it('has 30 daily buckets even across February', () => {
    const range = periodRange('monthly', new Date('2024-03-01T23:00:00Z'));
    expect(Math.floor((range.end.getTime() - range.start.getTime()) / DAY_MS) + 1).toBe(30);
  });
  it('exports current calendar month with exclusive next month boundary', () => {
    const range = monthRange(new Date('2026-12-31T23:59:59Z'));
    expect(range.start.toISOString()).toBe('2026-12-01T00:00:00.000Z');
    expect(range.end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
});
