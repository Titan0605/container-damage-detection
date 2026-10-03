import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type { AlertService, ReportRepository } from './domain.js';
import { apiRoutes } from './routes.js';
import { errorHandler } from './middleware/error-handler.js';

export function createApp(
  reports: ReportRepository,
  alerts: AlertService,
  options: { origin: string; ingestKey?: string },
) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: options.origin, exposedHeaders: ['Content-Disposition'] }));
  app.use(express.json({ limit: '1mb' }));
  app.use(
    '/api',
    (_req, res, next) => {
      res.setHeader('Cache-Control', 'no-store');
      next();
    },
    apiRoutes(reports, alerts, options.ingestKey),
  );
  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint no encontrado.' } });
  });
  app.use(errorHandler);
  return app;
}
