import 'dotenv/config';
import { z } from 'zod';

const optionalSecret = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1).optional(),
);
const schema = z
  .object({
    DATABASE_URL: z.string().url(),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    HOST: z.string().default('127.0.0.1'),
    FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    INGEST_API_KEY: optionalSecret,
    TWILIO_ACCOUNT_SID: optionalSecret,
    TWILIO_AUTH_TOKEN: optionalSecret,
    TWILIO_FROM: optionalSecret,
    ALERT_PHONE_NUMBERS: optionalSecret,
  })
  .superRefine((value, ctx) => {
    const sms = [
      value.TWILIO_ACCOUNT_SID,
      value.TWILIO_AUTH_TOKEN,
      value.TWILIO_FROM,
      value.ALERT_PHONE_NUMBERS,
    ];
    if (sms.some(Boolean) && !sms.every(Boolean))
      ctx.addIssue({
        code: 'custom',
        message: 'Configura las cuatro variables de SMS o deja todas vacías.',
      });
    if (value.TWILIO_ACCOUNT_SID && !/^AC[0-9a-fA-F]{32}$/.test(value.TWILIO_ACCOUNT_SID))
      ctx.addIssue({ code: 'custom', path: ['TWILIO_ACCOUNT_SID'], message: 'SID inválido.' });
    const numbers = [value.TWILIO_FROM, ...(value.ALERT_PHONE_NUMBERS?.split(',') ?? [])].filter(
      (item): item is string => Boolean(item),
    );
    if (numbers.some((number) => !/^\+[1-9]\d{7,14}$/.test(number.trim())))
      ctx.addIssue({ code: 'custom', message: 'Los teléfonos deben usar formato E.164.' });
  });

export function readConfig() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success)
    throw new Error(
      `Configuración inválida: ${parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`,
    );
  return parsed.data;
}
