import { PrismaClient } from '@prisma/client';
import { readConfig } from './config.js';
import { createApp } from './app.js';
import { PrismaReportRepository } from './repositories/prisma-report.repository.js';
import { SmsService } from './services/sms.service.js';

const config = readConfig();
const db = new PrismaClient();
const smsConfig =
  config.TWILIO_ACCOUNT_SID &&
  config.TWILIO_AUTH_TOKEN &&
  config.TWILIO_FROM &&
  config.ALERT_PHONE_NUMBERS
    ? {
        accountSid: config.TWILIO_ACCOUNT_SID,
        authToken: config.TWILIO_AUTH_TOKEN,
        from: config.TWILIO_FROM,
        recipients: [
          ...new Set(config.ALERT_PHONE_NUMBERS.split(',').map((number) => number.trim())),
        ],
      }
    : undefined;
const app = createApp(new PrismaReportRepository(db), new SmsService(smsConfig), {
  origin: config.FRONTEND_ORIGIN,
  ingestKey: config.INGEST_API_KEY,
});
await db.$connect();
const server = app.listen(config.PORT, config.HOST, () => {
  console.info(
    `API: http://${config.HOST}:${config.PORT}/api | SMS: ${smsConfig ? 'habilitado' : 'deshabilitado'}`,
  );
});
function shutdown() {
  const deadline = setTimeout(() => process.exit(1), 10000).unref();
  server.close(() => {
    void db.$disconnect().finally(() => {
      clearTimeout(deadline);
      process.exit(0);
    });
  });
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
