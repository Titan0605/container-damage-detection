import { useState } from 'react';
import { Button } from '@heroui/react';
import {
  ArrowUpRight,
  Box,
  CircleHelp,
  LayoutDashboard,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { Controls } from './components/Controls';
import { KpiCards } from './components/KpiCards';
import { Charts } from './components/Charts';
import { HistoryTable } from './components/HistoryTable';
import { useDashboardData } from './hooks/useDashboardData';
import { downloadCsv } from './lib/api';
import type { Period } from './types';

export default function App() {
  const [period, setPeriod] = useState<Period>('weekly');
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const { stats, reports, page, setPage, reload } = useDashboardData(period, search);
  const loading = stats.loading || reports.loading;
  const error = stats.error ?? reports.error;
  async function onExport() {
    setExporting(true);
    setExportError(null);
    try {
      await downloadCsv();
    } catch (cause: unknown) {
      setExportError(cause instanceof Error ? cause.message : 'No se pudo descargar el reporte.');
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="min-h-screen bg-[#f5f7f8] text-slate-700">
      <aside className="sidebar">
        <a href="#" className="flex items-center gap-3 text-white" aria-label="ContainerIQ, inicio">
          <span className="rounded-xl bg-[#2b4e4b] p-2.5">
            <ScanLine size={24} className="text-[#9ce1cb]" />
          </span>
          <span className="text-xl font-semibold tracking-tight">
            Container<span className="text-[#9ce1cb]">IQ</span>
          </span>
        </a>
        <div className="mt-12 text-[10px] font-semibold tracking-[0.17em] text-[#75948e]">
          ESPACIO DE TRABAJO
        </div>
        <nav className="mt-4">
          <a
            href="#dashboard"
            aria-current="page"
            className="flex items-center gap-3 rounded-lg bg-[#294744] px-4 py-3 text-sm font-medium text-[#c3f4e4]"
          >
            <LayoutDashboard size={18} />
            Vista general
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#8adabf]" />
          </a>
          <a
            href="#history-title"
            className="mt-2 flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-[#a5bab5] hover:bg-[#294744]"
          >
            <Box size={18} />
            Inspecciones
          </a>
        </nav>
        <div className="mt-auto rounded-xl border border-[#35514b] bg-[#1c3733] p-4">
          <ShieldCheck size={23} className="mb-3 text-[#98d7c1]" />
          <p className="text-sm text-white">Inspección inteligente</p>
          <p className="mt-2 text-xs leading-relaxed text-[#98b0a8]">
            Visibilidad de cada contenedor. Decisiones con datos.
          </p>
          <span className="mt-4 inline-flex items-center gap-2 text-[10px] tracking-widest text-[#98d7c1]">
            YOLO + OCR
            <ArrowUpRight size={13} />
          </span>
        </div>
        <div className="mt-6 flex items-center gap-3 border-t border-[#304b45] pt-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#34554d] text-xs font-semibold text-[#c2e8da]">
            OP
          </span>
          <div>
            <p className="text-xs font-medium text-white">Panel de operaciones</p>
            <p className="mt-1 text-[10px] text-[#8fa9a1]">Inspección de carga</p>
          </div>
        </div>
      </aside>
      <div className="lg:ml-[236px]">
        <header className="flex h-[76px] items-center justify-between border-b border-slate-200/80 bg-white px-5 md:px-9">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ScanLine size={20} className="mr-2 text-teal-700 lg:hidden" />
            <span>Operaciones</span>
            <span className="px-2">/</span>
            <span className="font-medium text-slate-700">Dashboard</span>
          </div>
          <span
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] ${error ? 'bg-amber-50 text-amber-700' : loading ? 'bg-slate-100 text-slate-500' : 'bg-teal-50 text-teal-700'}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {error ? 'Conexión pendiente' : loading ? 'Sincronizando' : 'Datos sincronizados'}
          </span>
        </header>
        <main id="dashboard" className="mx-auto max-w-[1500px] space-y-6 px-5 py-8 md:px-9">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-700">
                Centro de control
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-800 md:text-[29px]">
                Resumen de inspecciones
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                El estado de tu carga, en una sola vista.
              </p>
            </div>
            <Button
              isIconOnly
              aria-label="Actualizar datos"
              variant="bordered"
              onPress={reload}
              isDisabled={loading}
              className="border-slate-200 bg-white"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
          <Controls
            period={period}
            setPeriod={setPeriod}
            search={search}
            setSearch={setSearch}
            exporting={exporting}
            onExport={() => {
              void onExport();
            }}
          />
          <div className="flex flex-wrap justify-between gap-2 text-[11px] text-slate-400">
            <span>
              Vista {period === 'weekly' ? 'semanal · últimos 7 días' : 'mensual · últimos 30 días'}{' '}
              · UTC
            </span>
            <span>Exportación CSV: daños del mes actual</span>
          </div>
          {(error || exportError) && (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              <TriangleAlert size={18} />
              <span className="flex-1">{exportError ?? error}</span>
              <Button
                size="sm"
                variant="flat"
                onPress={() => {
                  setExportError(null);
                  reload();
                }}
              >
                Reintentar
              </Button>
            </div>
          )}
          <KpiCards stats={stats.data} loading={stats.loading} />
          <Charts stats={stats.data} loading={stats.loading} />
          <HistoryTable
            data={reports.data}
            loading={reports.loading}
            page={page}
            setPage={setPage}
            search={search}
          />
          <footer className="flex flex-wrap items-center justify-between gap-3 pb-2 text-[10px] text-slate-400">
            <span>ContainerIQ · Inteligencia para tu operación</span>
            <span className="flex items-center gap-1.5">
              <CircleHelp size={12} />
              La búsqueda filtra el historial; los indicadores resumen todo el periodo.
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
