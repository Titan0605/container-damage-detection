import { Card, CardBody, Skeleton } from '@heroui/react';
import { Box, ShieldAlert, Activity, type LucideIcon } from 'lucide-react';
import type { Stats } from '../types';
import { number } from '../lib/format';
function Kpi({
  label,
  value,
  caption,
  icon: Icon,
  tint,
  loading,
}: {
  label: string;
  value: string;
  caption: string;
  icon: LucideIcon;
  tint: string;
  loading: boolean;
}) {
  return (
    <Card shadow="none" className="border border-slate-200/80 rounded-2xl">
      <CardBody className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500">{label}</span>
          <span className={`rounded-xl p-2.5 ${tint}`}>
            <Icon size={20} />
          </span>
        </div>
        <Skeleton isLoaded={!loading} className="mt-3 w-32 rounded-lg">
          <p className="text-4xl font-semibold tracking-tight text-slate-800 tabular-nums">
            {value}
          </p>
        </Skeleton>
        <p className="mt-3 text-xs text-slate-400">{caption}</p>
      </CardBody>
    </Card>
  );
}
export function KpiCards({ stats, loading }: { stats: Stats | null; loading: boolean }) {
  return (
    <section aria-label="Indicadores de inspección" className="grid gap-4 sm:grid-cols-3">
      <Kpi
        label="Total escaneados"
        value={stats ? number.format(stats.total_scanned) : '—'}
        caption="Inspecciones en el periodo"
        icon={Box}
        tint="bg-teal-50 text-teal-700"
        loading={loading}
      />
      <Kpi
        label="Con daños detectados"
        value={stats ? number.format(stats.total_damaged) : '—'}
        caption="Inspecciones con al menos un daño"
        icon={ShieldAlert}
        tint="bg-orange-50 text-orange-600"
        loading={loading}
      />
      <Kpi
        label="Tasa de daño"
        value={stats ? `${number.format(stats.damage_rate)}%` : '—'}
        caption="Con daños / total de inspecciones"
        icon={Activity}
        tint="bg-blue-50 text-blue-600"
        loading={loading}
      />
    </section>
  );
}
