import { useCallback, useEffect, useState } from 'react';
import { fetchReports, fetchStats } from '../lib/api';
import type { Period, ReportPage, Stats } from '../types';

function useResource<T>(load: (signal: AbortSignal) => Promise<T>, refresh: number) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: string | null;
    updated: Date | null;
  }>({ data: null, loading: true, error: null, updated: null });
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(new DOMException('La consulta tardó demasiado.', 'TimeoutError')),
      15000,
    );
    let active = true;
    setState({ data: null, loading: true, error: null, updated: null });
    void load(controller.signal)
      .then((data) => {
        if (active) setState({ data, loading: false, error: null, updated: new Date() });
      })
      .catch((error: unknown) => {
        if (active)
          setState({
            data: null,
            loading: false,
            error: controller.signal.aborted
              ? 'La consulta tardó demasiado. Vuelve a intentar.'
              : error instanceof Error
                ? error.message
                : 'No se pudieron cargar los datos.',
            updated: null,
          });
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [load, refresh]);
  return state;
}

export function useDashboardData(period: Period, search: string) {
  const [refresh, setRefresh] = useState(0);
  const [filter, setFilter] = useState({ period, search: '', page: 1 });
  const normalized = search.trim().toUpperCase();
  useEffect(() => {
    const timer = setTimeout(
      () =>
        setFilter((current) =>
          current.period === period && current.search === normalized
            ? current
            : { period, search: normalized, page: 1 },
        ),
      350,
    );
    return () => clearTimeout(timer);
  }, [period, normalized]);
  const loadStats = useCallback((signal: AbortSignal) => fetchStats(period, signal), [period]);
  const loadReports = useCallback(
    (signal: AbortSignal) => fetchReports(filter.period, filter.search, filter.page, signal),
    [filter],
  );
  const stats = useResource<Stats>(loadStats, refresh);
  const reports = useResource<ReportPage>(loadReports, refresh);
  const setPage = (page: number) => setFilter((current) => ({ ...current, page }));
  const pendingFilter = filter.period !== period || filter.search !== normalized;
  return {
    stats,
    reports: {
      ...reports,
      loading: reports.loading || pendingFilter,
      data: pendingFilter ? null : reports.data,
    },
    page: filter.page,
    setPage,
    reload: () => setRefresh((value) => value + 1),
  };
}
