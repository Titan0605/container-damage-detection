import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { AlertService, Report, ReportRepository, Stats } from '../src/domain.js';
import type { CreateReportInput, ReportsQuery } from '../src/schemas.js';

const report: Report = {
  id: randomUUID(),
  serial_number: 'MSKU123',
  timestamp: new Date('2026-10-02T12:00:00Z'),
  image_url: null,
  damages: [],
};
const damaged: Report = {
  ...report,
  damages: [{ id: randomUUID(), report_id: report.id, damage_type: 'rust', confidence: 0.89 }],
};
const stats: Stats = {
  period: 'weekly',
  start: '2026-09-26T00:00:00Z',
  end: '2026-10-02T12:00:00Z',
  total_scanned: 2,
  total_damaged: 1,
  damage_rate: 50,
  damage_counts: [{ type: 'rust', count: 1 }],
  timeline: [],
};
const repository: ReportRepository = {
  create: vi.fn(async (input: CreateReportInput) => ({
    ...report,
    serial_number: input.serial_number,
    damages: input.damages.length ? damaged.damages : [],
  })),
  list: vi.fn(async (query: ReportsQuery) => ({
    data: [report],
    pagination: { page: query.page, limit: query.limit, total: 1, total_pages: 1 },
  })),
  stats: vi.fn(async () => stats),
  damagedThisMonth: vi.fn(async () => [damaged]),
  health: vi.fn(async () => {}),
};
const alerts: AlertService = {
  send: vi.fn<AlertService['send']>(async () => ({ status: 'accepted', accepted: 1, failed: 0 })),
};
const app = createApp(repository, alerts, { origin: 'http://localhost:5173' });
beforeEach(() => {
  vi.clearAllMocks();
});

describe('API REST', () => {
  it('normalizes serial and saves a report with nested damage', async () => {
    const response = await request(app)
      .post('/api/reports')
      .send({ serial_number: ' msku123 ', damages: [{ type: 'rust', confidence: 0.89 }] });
    expect(response.status).toBe(201);
    expect(response.body.data.serial_number).toBe('MSKU123');
    expect(repository.create).toHaveBeenCalledWith({
      serial_number: 'MSKU123',
      damages: [{ type: 'rust', confidence: 0.89 }],
    });
    expect(alerts.send).toHaveBeenCalledWith(damaged);
  });
  it.each([
    { serial_number: '', damages: [] },
    { serial_number: 'MSKU123', damages: [{ type: 'rust', confidence: 1.01 }] },
    { serial_number: 'MSKU123', damages: [{ type: 'fire', confidence: 0.9 }] },
    { serial_number: 'MSKU123', damages: [{ type: 'dent', confidence: '0.9' }] },
    { serial_number: 'MSKU123' },
    { serial_number: '=FORMULA', damages: [] },
    { serial_number: 'MSKU123', damages: [], image_url: 'file:///tmp/secret' },
  ])('rejects invalid inference before saving: %j', async (body) => {
    const response = await request(app).post('/api/reports').send(body);
    expect(response.status).toBe(400);
    expect(repository.create).not.toHaveBeenCalled();
    expect(alerts.send).not.toHaveBeenCalled();
  });
  it('keeps the successful write when the SMS provider throws', async () => {
    vi.mocked(alerts.send).mockRejectedValueOnce(new Error('provider down'));
    const response = await request(app)
      .post('/api/reports')
      .send({ serial_number: 'MSKU123', damages: [{ type: 'rust', confidence: 0.9 }] });
    expect(response.status).toBe(201);
    expect(response.body.alert.status).toBe('failed');
  });
  it('validates stats period and returns the requested period', async () => {
    expect((await request(app).get('/api/stats?period=yearly')).status).toBe(400);
    expect((await request(app).get('/api/stats?period=monthly')).status).toBe(200);
    expect(repository.stats).toHaveBeenCalledWith('monthly');
  });
  it('passes exact serial search and paging independently of optional period', async () => {
    expect((await request(app).get('/api/reports?search=msku123&page=2&limit=5')).status).toBe(200);
    expect(repository.list).toHaveBeenCalledWith({ search: 'MSKU123', page: 2, limit: 5 });
    expect((await request(app).get('/api/reports?page=-1')).status).toBe(400);
    expect((await request(app).get('/api/reports?limit=1000')).status).toBe(400);
  });
  it('exports an attachment with the requested columns and UTC timestamp', async () => {
    const response = await request(app).get('/api/reports/export');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.text).toContain('Número de serie');
    expect(response.text).toContain('2026-10-02T12:00:00.000Z');
    expect(response.text).toContain('rust');
  });
  it('exports headers for an empty month', async () => {
    vi.mocked(repository.damagedThisMonth).mockResolvedValueOnce([]);
    const response = await request(app).get('/api/reports/export');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Tipos de daño');
  });
  it('neutralizes spreadsheet formulas in legacy serial data', async () => {
    vi.mocked(repository.damagedThisMonth).mockResolvedValueOnce([
      { ...damaged, serial_number: '=1+1' },
    ]);
    expect((await request(app).get('/api/reports/export')).text).toContain("'=1+1");
  });
  it('returns JSON for malformed JSON, oversized bodies and missing endpoints', async () => {
    expect(
      (await request(app).post('/api/reports').set('Content-Type', 'application/json').send('{'))
        .status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post('/api/reports')
          .send({ serial_number: 'x'.repeat(1_100_000) })
      ).status,
    ).toBe(413);
    expect((await request(app).get('/reports')).body.error.code).toBe('NOT_FOUND');
  });
  it('requires ingestion key when configured', async () => {
    const secured = createApp(repository, alerts, {
      origin: 'http://localhost:5173',
      ingestKey: 'test-secret',
    });
    const body = { serial_number: 'MSKU123', damages: [] };
    expect((await request(secured).post('/api/reports').send(body)).status).toBe(401);
    expect(
      (await request(secured).post('/api/reports').set('X-API-Key', 'test-secret').send(body))
        .status,
    ).toBe(201);
  });
  it('does not leak internal errors', async () => {
    vi.mocked(repository.list).mockRejectedValueOnce(new Error('postgresql://secret'));
    const response = await request(app).get('/api/reports');
    expect(response.status).toBe(500);
    expect(response.text).not.toContain('secret');
  });
});
