// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDashboardData } from '../src/hooks/useDashboardData';
import { fetchReports, fetchStats } from '../src/lib/api';
import type { Stats } from '../src/types';
vi.mock('../src/lib/api', () => ({ fetchReports: vi.fn(), fetchStats: vi.fn() }));
const stats: Stats = {
  period: 'weekly',
  start: '2026-09-26T00:00:00Z',
  end: '2026-10-02T12:00:00Z',
  total_scanned: 0,
  total_damaged: 0,
  damage_rate: 0,
  damage_counts: [],
  timeline: [],
};
const page = { data: [], pagination: { page: 1, limit: 10, total: 0, total_pages: 0 } };
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
describe('dashboard queries', () => {
  it('loads empty data without inventing metrics and normalizes debounced search', async () => {
    vi.mocked(fetchStats).mockResolvedValue(stats);
    vi.mocked(fetchReports).mockResolvedValue(page);
    const { result, rerender } = renderHook(({ search }) => useDashboardData('weekly', search), {
      initialProps: { search: '' },
    });
    await waitFor(() => expect(result.current.stats.loading).toBe(false));
    expect(result.current.stats.data?.total_scanned).toBe(0);
    rerender({ search: ' msku123 ' });
    expect(result.current.reports.loading).toBe(true);
    await waitFor(() =>
      expect(fetchReports).toHaveBeenLastCalledWith(
        'weekly',
        'MSKU123',
        1,
        expect.any(AbortSignal),
      ),
    );
    expect(fetchStats).toHaveBeenCalledTimes(1);
  });
  it('surfaces API failures and reloads successfully', async () => {
    vi.mocked(fetchStats)
      .mockRejectedValueOnce(new Error('API no disponible'))
      .mockResolvedValue(stats);
    vi.mocked(fetchReports).mockResolvedValue(page);
    const { result } = renderHook(() => useDashboardData('weekly', ''));
    await waitFor(() => expect(result.current.stats.error).toBe('API no disponible'));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.stats.data).toEqual(stats));
    expect(result.current.stats.error).toBeNull();
  });
  it('ignores a stale response after the period changes', async () => {
    let resolveOld: ((value: Stats) => void) | undefined;
    vi.mocked(fetchStats)
      .mockImplementationOnce(
        () =>
          new Promise<Stats>((resolve) => {
            resolveOld = resolve;
          }),
      )
      .mockResolvedValue({ ...stats, period: 'monthly', total_scanned: 5 });
    vi.mocked(fetchReports).mockResolvedValue(page);
    const { result, rerender } = renderHook(({ period }) => useDashboardData(period, ''), {
      initialProps: { period: 'weekly' as 'weekly' | 'monthly' },
    });
    rerender({ period: 'monthly' });
    await waitFor(() => expect(result.current.stats.data?.total_scanned).toBe(5));
    await act(async () => resolveOld?.(stats));
    expect(result.current.stats.data?.period).toBe('monthly');
  });
});
