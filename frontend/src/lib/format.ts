export const number = new Intl.NumberFormat('es-MX');
export const dateTime = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
});
export const dayLabel = (value: string) =>
  new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00Z`),
  );
export const damageMeta: Record<string, { label: string; color: string; className: string }> = {
  hole: { label: 'Agujero', color: '#dc6262', className: 'bg-red-50 text-red-700 border-red-100' },
  rust: {
    label: 'Óxido',
    color: '#e6a446',
    className: 'bg-amber-50 text-amber-700 border-amber-100',
  },
  dent: {
    label: 'Abolladura',
    color: '#6988bc',
    className: 'bg-blue-50 text-blue-700 border-blue-100',
  },
};
