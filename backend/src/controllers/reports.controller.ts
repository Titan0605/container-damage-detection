import type { Request, Response } from 'express';
import { Parser } from '@json2csv/plainjs';
import type { AlertService, ReportRepository } from '../domain.js';
import { createReportSchema, reportsQuerySchema } from '../schemas.js';

export class ReportsController {
  constructor(
    private readonly reports: ReportRepository,
    private readonly alerts: AlertService,
  ) {}
  create = async (req: Request, res: Response) => {
    const report = await this.reports.create(createReportSchema.parse(req.body));
    // Persist first. A provider outage must never turn a saved report into a retryable 500.
    const alert = await this.alerts.send(report).catch(() => {
      console.error(JSON.stringify({ event: 'sms_failed', report_id: report.id }));
      return { status: 'failed' as const, accepted: 0, failed: 1 };
    });
    res.status(201).json({ data: report, alert });
  };
  list = async (req: Request, res: Response) => {
    res.json(await this.reports.list(reportsQuerySchema.parse(req.query)));
  };
  export = async (_req: Request, res: Response) => {
    const reports = await this.reports.damagedThisMonth();
    const safeCell = (value: string) => (/^[=+\-@\t\r\n]/.test(value) ? `'${value}` : value);
    const parser = new Parser({
      fields: ['Número de serie', 'Fecha', 'Tipos de daño'],
      eol: '\r\n',
    });
    const csv = parser.parse(
      reports.map((report) => ({
        'Número de serie': safeCell(report.serial_number),
        Fecha: report.timestamp.toISOString(),
        'Tipos de daño': safeCell(
          [...new Set(report.damages.map((damage) => damage.damage_type))].sort().join(', '),
        ),
      })),
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="contenedores-danados-${new Date().toISOString().slice(0, 7)}.csv"`,
    );
    res.send(`\uFEFF${csv}`);
  };
}
