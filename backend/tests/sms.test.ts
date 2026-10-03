import { describe, expect, it, vi } from 'vitest';
import type { Report } from '../src/domain.js';
import { SmsService } from '../src/services/sms.service.js';
const report: Report = {
  id: 'report-1',
  serial_number: 'MSKU123',
  timestamp: new Date(),
  image_url: null,
  damages: [{ id: 'damage-1', report_id: 'report-1', damage_type: 'hole', confidence: 0.99 }],
};
const config = {
  accountSid: 'test',
  authToken: 'secret',
  from: '+15555550101',
  recipients: ['+15555550102', '+15555550103'],
};
describe('SMS delivery', () => {
  it('sends one request per administrator', async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 201 }));
    expect(await new SmsService(config, transport).send(report)).toEqual({
      status: 'accepted',
      accepted: 2,
      failed: 0,
    });
    expect(transport).toHaveBeenCalledTimes(2);
    const body = transport.mock.calls[0]?.[1]?.body;
    expect(body).toBeInstanceOf(URLSearchParams);
    expect(String(body)).toContain('MSKU123');
  });
  it('does not send for clean reports or missing configuration', async () => {
    const transport = vi.fn<typeof fetch>();
    expect((await new SmsService(config, transport).send({ ...report, damages: [] })).status).toBe(
      'not_required',
    );
    expect((await new SmsService(undefined, transport).send(report)).status).toBe('disabled');
    expect(transport).not.toHaveBeenCalled();
  });
  it('reports partial provider failures', async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('{}', { status: 201 }))
      .mockResolvedValueOnce(new Response('{}', { status: 503 }));
    expect(await new SmsService(config, transport).send(report)).toEqual({
      status: 'failed',
      accepted: 1,
      failed: 1,
    });
  });
});
