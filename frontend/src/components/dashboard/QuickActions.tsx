import { Link } from 'react-router-dom';
import { FiBarChart2, FiClock, FiDownload, FiFileText, FiUploadCloud } from 'react-icons/fi';
import type { IconType } from 'react-icons';

interface QuickActionsProps {
  onExport: () => void;
}

const actions: Array<{ label: string; to: string; icon: IconType }> = [
  { label: 'Cargar nuevo archivo', to: '/upload', icon: FiUploadCloud },
  { label: 'Ver transacciones', to: '/transactions', icon: FiFileText },
  { label: 'Ver resultados', to: '/results', icon: FiBarChart2 },
  { label: 'Consultar historial', to: '/history', icon: FiClock },
];

export default function QuickActions({ onExport }: QuickActionsProps) {
  return (
    <section className="app-card rounded-[24px] p-5 lg:p-6">
      <h2 className="text-lg font-bold text-slate-950">Acciones rápidas</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.to}
              to={action.to}
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {action.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onExport}
          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800"
        >
          <FiDownload className="h-4 w-4" aria-hidden="true" />
          Exportar resumen
        </button>
      </div>
    </section>
  );
}
