import type { Request, Response } from 'express';
import type { ReportRepository } from '../domain.js';
import { statsQuerySchema } from '../schemas.js';
export class StatsController {
  constructor(private readonly reports: ReportRepository) {}
  get = async (req: Request, res: Response) => {
    res.json(await this.reports.stats(statsQuerySchema.parse(req.query).period));
  };
}
