import { z } from 'zod';
export type Period = 'weekly' | 'monthly';
export const reportSchema = z.object({
  id: z.string().uuid(),
  serial_number: z.string(),
  timestamp: z.string().datetime(),
  image_url: z.string().nullable(),
  damages: z.array(
    z.object({
      id: z.string().uuid(),
      report_id: z.string().uuid(),
      damage_type: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  ),
});
export const reportPageSchema = z.object({
  data: z.array(reportSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    total_pages: z.number(),
  }),
});
export const statsSchema = z.object({
  period: z.enum(['weekly', 'monthly']),
  start: z.string().datetime(),
  end: z.string().datetime(),
  total_scanned: z.number().nonnegative(),
  total_damaged: z.number().nonnegative(),
  damage_rate: z.number().min(0).max(100),
  damage_counts: z.array(z.object({ type: z.string(), count: z.number().nonnegative() })),
  timeline: z.array(z.object({ date: z.string(), scanned: z.number(), damaged: z.number() })),
});
export type Report = z.infer<typeof reportSchema>;
export type ReportPage = z.infer<typeof reportPageSchema>;
export type Stats = z.infer<typeof statsSchema>;
