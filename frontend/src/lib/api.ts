import { z } from 'zod';
import { reportPageSchema, statsSchema, type Period } from '../types';
const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const errorSchema = z.object({ error: z.object({ message: z.string() }) });

async function checkResponse(response: Response) {
  if (response.ok) return response;
  const body: unknown = await response.json().catch(() => null);
  const parsed = errorSchema.safeParse(body);
  throw new Error(
    parsed.success
      ? parsed.data.error.message
      : `No se pudo conectar con la API (${response.status}).`,
  );
}
async function get<T>(path: string, schema: z.ZodType<T>, signal: AbortSignal): Promise<T> {
  const response = await checkResponse(await fetch(`${baseUrl}/api${path}`, { signal }));
  const body: unknown = await response.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new Error('La respuesta del servidor tiene un formato inesperado.');
  return parsed.data;
}
export function fetchStats(period: Period, signal: AbortSignal) {
  return get(`/stats?period=${period}`, statsSchema, signal);
}
export function fetchReports(period: Period, search: string, page: number, signal: AbortSignal) {
  const query = new URLSearchParams({ period, page: String(page), limit: '10' });
  if (search) query.set('search', search);
  return get(`/reports?${query.toString()}`, reportPageSchema, signal);
}
export async function downloadCsv() {
  const response = await checkResponse(
    await fetch(`${baseUrl}/api/reports/export`, { signal: AbortSignal.timeout(30000) }),
  );
  if (!response.headers.get('content-type')?.includes('text/csv'))
    throw new Error('El servidor no devolvió un archivo CSV.');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download =
    response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] ??
    'contenedores-danados.csv';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
