import {
  Chip,
  Pagination,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@heroui/react';
import { Box, CheckCircle2 } from 'lucide-react';
import type { ReportPage } from '../types';
import { damageMeta, dateTime, number } from '../lib/format';
export function HistoryTable({
  data,
  loading,
  page,
  setPage,
  search,
}: {
  data: ReportPage | null;
  loading: boolean;
  page: number;
  setPage: (page: number) => void;
  search: string;
}) {
  return (
    <section className="panel !p-0 overflow-hidden" aria-labelledby="history-title">
      <div className="flex flex-wrap items-center justify-between gap-2 px-6 pb-4 pt-6">
        <div>
          <h2 id="history-title">
            Historial de inspecciones{' '}
            <span className="ml-2 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
              {data ? number.format(data.pagination.total) : '—'}
            </span>
          </h2>
          <p className="subtitle">
            {search
              ? `Resultados de ${search.toUpperCase()} en el periodo seleccionado`
              : 'Registro de contenedores en el periodo seleccionado'}
          </p>
        </div>
        <span className="text-xs text-slate-400">Fecha y hora en UTC</span>
      </div>
      <div className="overflow-x-auto">
        <Table
          aria-label="Historial de inspecciones de contenedores"
          removeWrapper
          classNames={{
            th: 'bg-slate-50 text-slate-400 text-[11px] uppercase tracking-wider font-medium first:rounded-none last:rounded-none h-11',
            td: 'py-4 border-b border-slate-100 first:pl-6 last:pr-6',
            table: 'min-w-[580px]',
          }}
        >
          <TableHeader>
            <TableColumn>Número de serie</TableColumn>
            <TableColumn>Fecha de inspección</TableColumn>
            <TableColumn>Daños detectados</TableColumn>
          </TableHeader>
          <TableBody
            items={data?.data ?? []}
            isLoading={loading}
            loadingContent={<Spinner label="Cargando inspecciones" />}
            emptyContent={loading ? ' ' : 'No se encontraron inspecciones.'}
          >
            {(report) => (
              <TableRow key={report.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-slate-50 p-2 text-slate-400">
                      <Box size={17} />
                    </span>
                    <span className="font-mono text-xs font-semibold tracking-wide text-slate-700">
                      {report.serial_number}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-500">
                    {dateTime.format(new Date(report.timestamp))}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {report.damages.length ? (
                      [...new Set(report.damages.map((damage) => damage.damage_type))].map(
                        (type) => (
                          <Chip
                            size="sm"
                            variant="flat"
                            key={type}
                            className={`border text-[11px] ${damageMeta[type]?.className ?? 'bg-slate-100 text-slate-600'}`}
                          >
                            {damageMeta[type]?.label ?? type}
                          </Chip>
                        ),
                      )
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-teal-600">
                        <CheckCircle2 size={14} />
                        Sin daños
                      </span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <span className="text-xs text-slate-400">
          {data?.pagination.total
            ? `${(page - 1) * data.pagination.limit + 1}–${Math.min(page * data.pagination.limit, data.pagination.total)} de ${number.format(data.pagination.total)} inspecciones`
            : '0 inspecciones'}
        </span>
        {data && data.pagination.total_pages > 1 && (
          <Pagination
            aria-label="Páginas del historial"
            page={page}
            total={data.pagination.total_pages}
            onChange={setPage}
            isDisabled={loading}
            size="sm"
            showControls
            color="primary"
          />
        )}
      </div>
    </section>
  );
}
