import { Spinner } from '@heroui/react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import type { Stats } from '../types';
import { damageMeta, dayLabel, number } from '../lib/format';
export function Charts({ stats, loading }: { stats: Stats | null; loading: boolean }) {
  const distribution =
    stats?.damage_counts
      .filter((item) => item.count > 0)
      .map((item) => ({ ...item, name: damageMeta[item.type]?.label ?? item.type })) ?? [];
  const total = distribution.reduce((sum, item) => sum + item.count, 0);
  return (
    <section aria-label="Gráficos de inspección" className="grid gap-5 lg:grid-cols-[1.65fr_1fr]">
      <article className="panel min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2>Volumen de inspecciones</h2>
            <p className="subtitle">Actividad diaria de los contenedores</p>
          </div>
          <div className="flex gap-4 text-xs text-slate-500">
            <span className="legend-dot before:bg-teal-600">Escaneados</span>
            <span className="legend-dot before:bg-amber-500">Con daños</span>
          </div>
        </div>
        <div
          className="mt-7 h-64"
          role="img"
          aria-label={
            stats
              ? `Total: ${stats.total_scanned} escaneados y ${stats.total_damaged} con daños.`
              : 'Volumen de inspecciones'
          }
        >
          {loading ? (
            <ChartLoading />
          ) : !stats || stats.total_scanned === 0 ? (
            <EmptyChart
              text={stats ? 'Aún no hay inspecciones en este periodo' : 'Datos no disponibles'}
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={stats.timeline}
                margin={{ left: -22, right: 10, top: 5, bottom: 0 }}
                accessibilityLayer
              >
                <defs>
                  <linearGradient id="scanFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#159986" stopOpacity={0.16} />
                    <stop offset="100%" stopColor="#159986" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e8edf0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={dayLabel}
                  tick={{ fontSize: 11, fill: '#8b98a5' }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={35}
                  dy={8}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#8b98a5' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  labelFormatter={(label) => dayLabel(String(label))}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                />
                <Area
                  type="monotone"
                  dataKey="scanned"
                  name="Escaneados"
                  stroke="#0f9682"
                  strokeWidth={2.5}
                  fill="url(#scanFill)"
                />
                <Area
                  type="monotone"
                  dataKey="damaged"
                  name="Con daños"
                  stroke="#e6a446"
                  strokeWidth={2}
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </article>
      <article className="panel min-w-0">
        <h2>Distribución de daños</h2>
        <p className="subtitle">Detecciones por tipo de daño</p>
        {loading ? (
          <div className="h-64">
            <ChartLoading />
          </div>
        ) : total === 0 ? (
          <div className="h-64">
            <EmptyChart
              text={stats ? 'Sin daños registrados en el periodo' : 'Datos no disponibles'}
            />
          </div>
        ) : (
          <>
            <div
              className="relative h-52"
              role="img"
              aria-label={distribution.map((item) => `${item.name}: ${item.count}`).join(', ')}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribution}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={83}
                    paddingAngle={4}
                    stroke="none"
                  >
                    {distribution.map((item) => (
                      <Cell key={item.type} fill={damageMeta[item.type]?.color ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <strong className="text-3xl font-semibold text-slate-800">
                  {number.format(total)}
                </strong>
                <span className="text-xs text-slate-400">detecciones</span>
              </div>
            </div>
            <div className="space-y-2">
              {distribution.map((item) => (
                <div key={item.type} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: damageMeta[item.type]?.color }}
                  />
                  <span className="text-slate-500">{item.name}</span>
                  <strong className="ml-auto text-slate-700">{number.format(item.count)}</strong>
                  <span className="w-10 text-right text-slate-400">
                    {Math.round((item.count / total) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </article>
    </section>
  );
}
function ChartLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <Spinner label="Cargando datos" color="primary" size="sm" />
    </div>
  );
}
function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-slate-400">
      <BarChart3 size={28} strokeWidth={1.4} />
      {text}
    </div>
  );
}
