import { Button, Input, Select, SelectItem } from '@heroui/react';
import { CalendarDays, Download, Search } from 'lucide-react';
import type { Period } from '../types';
interface Props {
  period: Period;
  setPeriod: (value: Period) => void;
  search: string;
  setSearch: (value: string) => void;
  exporting: boolean;
  onExport: () => void;
}
export function Controls({ period, setPeriod, search, setSearch, exporting, onExport }: Props) {
  return (
    <section aria-label="Controles del dashboard" className="flex flex-wrap items-center gap-3">
      <Select
        aria-label="Periodo de datos"
        selectedKeys={[period]}
        onSelectionChange={(keys) => {
          const key = Array.from(keys)[0];
          if (key === 'weekly' || key === 'monthly') setPeriod(key);
        }}
        startContent={<CalendarDays size={17} />}
        className="w-44"
        variant="bordered"
        classNames={{ trigger: 'bg-white border-slate-200 border shadow-none h-11' }}
      >
        <SelectItem key="weekly">Semanal</SelectItem>
        <SelectItem key="monthly">Mensual</SelectItem>
      </Select>
      <Input
        aria-label="Buscar por número de serie"
        placeholder="Buscar número de serie…"
        value={search}
        onValueChange={setSearch}
        maxLength={32}
        isClearable
        onClear={() => setSearch('')}
        startContent={<Search size={18} className="text-slate-400" />}
        className="min-w-56 flex-1 md:max-w-sm"
        variant="bordered"
        classNames={{ inputWrapper: 'bg-white border-slate-200 border shadow-none h-11' }}
      />
      <Button
        onPress={onExport}
        isLoading={exporting}
        startContent={!exporting && <Download size={17} />}
        color="primary"
        className="h-11 px-5 font-medium md:ml-auto"
      >
        Descargar reporte CSV
      </Button>
    </section>
  );
}
