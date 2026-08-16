const statusStyles = {
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  processing: 'bg-blue-50 text-blue-700 ring-blue-100',
  pending: 'bg-amber-50 text-amber-700 ring-amber-100',
  failed: 'bg-red-50 text-red-700 ring-red-100',
  unknown: 'bg-slate-100 text-slate-700 ring-slate-200',
};

function normalizeStatus(status?: string) {
  const value = status?.trim().toLowerCase() ?? '';

  if (['completed', 'completado', 'complete', 'success'].includes(value)) {
    return { label: 'Completado', tone: statusStyles.completed };
  }

  if (['processing', 'procesando', 'in_progress'].includes(value)) {
    return { label: 'Procesando', tone: statusStyles.processing };
  }

  if (['pending', 'pendiente'].includes(value)) {
    return { label: 'Pendiente', tone: statusStyles.pending };
  }

  if (['failed', 'fallido', 'error', 'rejected', 'rechazado'].includes(value)) {
    return {
      label: value.includes('reject') || value.includes('rechaz')
        ? 'Rechazado'
        : 'Fallido',
      tone: statusStyles.failed,
    };
  }

  return { label: status || 'Desconocido', tone: statusStyles.unknown };
}

export default function HistoryStatusBadge({ status }: { status?: string }) {
  const normalized = normalizeStatus(status);

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${normalized.tone}`}>
      {normalized.label}
    </span>
  );
}
