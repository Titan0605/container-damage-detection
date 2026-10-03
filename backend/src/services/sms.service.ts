import type { AlertResult, AlertService, Report } from '../domain.js';

export interface SmsConfig {
  accountSid: string;
  authToken: string;
  from: string;
  recipients: string[];
}
export class SmsService implements AlertService {
  constructor(
    private readonly config?: SmsConfig,
    private readonly request: typeof fetch = fetch,
  ) {}

  async send(report: Report): Promise<AlertResult> {
    if (report.damages.length === 0) return { status: 'not_required', accepted: 0, failed: 0 };
    const config = this.config;
    if (!config) return { status: 'disabled', accepted: 0, failed: 0 };
    const types = [...new Set(report.damages.map((damage) => damage.damage_type))].join(', ');
    const results = await Promise.allSettled(
      config.recipients.map(async (to) => {
        const response = await this.request(
          `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
          {
            method: 'POST',
            signal: AbortSignal.timeout(8000),
            headers: {
              Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: to,
              From: config.from,
              Body: `Inspección: ${report.serial_number}. Daños: ${types}. Reporte: ${report.id}`,
            }),
          },
        );
        if (!response.ok) throw new Error(`SMS provider returned ${response.status}`);
      }),
    );
    const failed = results.filter((result) => result.status === 'rejected').length;
    if (failed)
      console.error(JSON.stringify({ event: 'sms_failed', report_id: report.id, failed }));
    return { status: failed ? 'failed' : 'accepted', accepted: results.length - failed, failed };
  }
}
