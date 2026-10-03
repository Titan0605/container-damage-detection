import type { Period } from '../schemas.js';
export const DAY_MS = 86_400_000;

export function periodRange(period: Period, now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - (period === 'weekly' ? 6 : 29));
  return { start, end: now };
}
export function monthRange(now = new Date()) {
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
}
export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}
