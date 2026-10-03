import { Router, type RequestHandler } from 'express';
import { timingSafeEqual } from 'node:crypto';
import type { AlertService, ReportRepository } from './domain.js';
import { ReportsController } from './controllers/reports.controller.js';
import { StatsController } from './controllers/stats.controller.js';

export function apiRoutes(reports: ReportRepository, alerts: AlertService, ingestKey?: string) {
  const router = Router();
  const controller = new ReportsController(reports, alerts);
  const authenticate: RequestHandler = (req, res, next) => {
    if (ingestKey) {
      const supplied = Buffer.from(req.header('X-API-Key') ?? '');
      const expected = Buffer.from(ingestKey);
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
        res
          .status(401)
          .json({ error: { code: 'UNAUTHORIZED', message: 'Credencial de ingestión inválida.' } });
        return;
      }
    }
    next();
  };
  router.get('/health', async (_req, res) => {
    await reports.health();
    res.json({ status: 'ok' });
  });
  router.post('/reports', authenticate, controller.create);
  router.get('/reports/export', controller.export);
  router.get('/reports', controller.list);
  router.get('/stats', new StatsController(reports).get);
  return router;
}
