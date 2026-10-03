import { z } from 'zod';

export const periodSchema = z.enum(['weekly', 'monthly']);
export const createReportSchema = z
  .object({
    serial_number: z
      .string()
      .trim()
      .min(3)
      .max(32)
      .regex(/^[a-zA-Z0-9-]+$/, 'Usa letras, números o guiones.')
      .transform((value) => value.toUpperCase()),
    image_url: z
      .string()
      .url()
      .max(2048)
      .refine((url) => /^https?:\/\//i.test(url), 'Usa una URL HTTP o HTTPS.')
      .optional(),
    damages: z
      .array(
        z
          .object({
            type: z.enum(['hole', 'rust', 'dent']),
            confidence: z.number().finite().min(0).max(1),
          })
          .strict(),
      )
      .max(500),
  })
  .strict();

export const statsQuerySchema = z.object({ period: periodSchema.default('weekly') }).strict();
export const reportsQuerySchema = z
  .object({
    search: z
      .string()
      .trim()
      .max(32)
      .regex(/^[a-zA-Z0-9-]*$/)
      .transform((value) => value.toUpperCase())
      .optional(),
    period: periodSchema.optional(),
    page: z.coerce.number().int().min(1).max(1000000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  })
  .strict();
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ReportsQuery = z.infer<typeof reportsQuerySchema>;
export type Period = z.infer<typeof periodSchema>;
