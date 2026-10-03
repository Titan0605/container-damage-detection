import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaReportRepository } from '../src/repositories/prisma-report.repository.js';

const testUrl = process.env.TEST_DATABASE_URL;
// Only a dedicated test database is accepted; no mutation of the development DB.
if (testUrl && new URL(testUrl).pathname !== '/container_inspection_test')
  throw new Error('TEST_DATABASE_URL debe apuntar a container_inspection_test.');
describe.skipIf(!testUrl)('PostgreSQL integration', () => {
  const db = new PrismaClient({
    datasourceUrl: testUrl ?? 'postgresql://localhost/container_inspection_test',
  });
  const repository = new PrismaReportRepository(db);
  beforeAll(async () => {
    await db.$connect();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-02T12:00:00Z'));
  });
  beforeEach(async () => {
    await db.containerReport.deleteMany();
  });
  afterAll(async () => {
    await db.containerReport.deleteMany();
    await db.$disconnect();
    vi.useRealTimers();
  });

  it('atomically persists nested detections and enforces confidence bounds', async () => {
    const report = await repository.create({
      serial_number: 'TEST001',
      damages: [
        { type: 'rust', confidence: 0.91 },
        { type: 'hole', confidence: 0.8 },
      ],
    });
    expect(report.damages).toHaveLength(2);
    expect(report.damages.every((damage) => damage.report_id === report.id)).toBe(true);
    await expect(
      repository.create({ serial_number: 'TEST002', damages: [{ type: 'dent', confidence: 5 }] }),
    ).rejects.toThrow();
    expect(await db.containerReport.count({ where: { serial_number: 'TEST002' } })).toBe(0);
  });
  it('counts inspections once and detections individually, fills missing days, and excludes outside dates', async () => {
    for (const [serial, timestamp, types] of [
      ['TEST001', '2026-09-26T00:00:00Z', ['rust', 'rust', 'hole']],
      ['TEST002', '2026-10-02T11:59:00Z', []],
      ['TEST003', '2026-09-25T23:59:59Z', ['dent']],
      ['TEST004', '2026-10-02T12:00:01Z', ['hole']],
    ] satisfies [string, string, string[]][]) {
      await db.containerReport.create({
        data: {
          serial_number: serial,
          timestamp: new Date(timestamp),
          damages: { create: types.map((type) => ({ damage_type: type, confidence: 0.9 })) },
        },
      });
    }
    const stats = await repository.stats('weekly');
    expect(stats.total_scanned).toBe(2);
    expect(stats.total_damaged).toBe(1);
    expect(stats.damage_rate).toBe(50);
    expect(stats.damage_counts).toEqual([
      { type: 'hole', count: 1 },
      { type: 'rust', count: 2 },
      { type: 'dent', count: 0 },
    ]);
    expect(stats.timeline).toHaveLength(7);
    expect(stats.timeline[0]).toEqual({ date: '2026-09-26', scanned: 1, damaged: 1 });
    expect(stats.timeline[1]).toEqual({ date: '2026-09-27', scanned: 0, damaged: 0 });
    const monthly = await repository.stats('monthly');
    expect(monthly.total_scanned).toBe(3);
    expect(monthly.timeline).toHaveLength(30);
  });
  it('returns empty stats with zero rate', async () => {
    const stats = await repository.stats('weekly');
    expect(stats.damage_rate).toBe(0);
    expect(stats.timeline.every((day) => day.scanned === 0)).toBe(true);
  });
  it('supports exact serial history, optional period, and deterministic pagination', async () => {
    for (const [serial, timestamp] of [
      ['MSKU123', '2026-10-01T00:00:00Z'],
      ['MSKU123', '2026-01-01T00:00:00Z'],
      ['MSKU1234', '2026-10-01T00:00:00Z'],
    ]) {
      await db.containerReport.create({
        data: { serial_number: serial ?? '', timestamp: new Date(timestamp ?? '') },
      });
    }
    const all = await repository.list({ search: 'MSKU123', page: 1, limit: 1 });
    expect(all.pagination.total).toBe(2);
    expect(all.pagination.total_pages).toBe(2);
    expect(all.data).toHaveLength(1);
    const second = await repository.list({ search: 'MSKU123', page: 2, limit: 1 });
    expect(second.data[0]?.id).not.toBe(all.data[0]?.id);
    const recent = await repository.list({
      search: 'MSKU123',
      period: 'weekly',
      page: 1,
      limit: 10,
    });
    expect(recent.pagination.total).toBe(1);
  });
  it('exports only damaged inspections within the calendar month', async () => {
    for (const [serial, timestamp, damaged] of [
      ['TESTPREV', '2026-09-30T23:59:59Z', true],
      ['TESTSTART', '2026-10-01T00:00:00Z', true],
      ['TESTCLEAN', '2026-10-02T00:00:00Z', false],
      ['TESTNEXT', '2026-11-01T00:00:00Z', true],
    ] satisfies [string, string, boolean][]) {
      await db.containerReport.create({
        data: {
          serial_number: serial,
          timestamp: new Date(timestamp),
          damages: { create: damaged ? [{ damage_type: 'hole', confidence: 0.8 }] : [] },
        },
      });
    }
    expect((await repository.damagedThisMonth()).map((report) => report.serial_number)).toEqual([
      'TESTSTART',
    ]);
  });
});
