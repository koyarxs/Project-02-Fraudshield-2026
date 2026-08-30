import { Link } from 'react-router-dom';
import { FiBarChart2, FiLayers, FiUploadCloud } from 'react-icons/fi';
import type { IconType } from 'react-icons';

const actions: Array<{ label: string; to: string; icon: IconType }> = [
  { label: 'Cargar archivo', to: '/upload', icon: FiUploadCloud },
  { label: 'Revisar resultados', to: '/results', icon: FiBarChart2 },
  { label: 'Consultar casos', to: '/case-history', icon: FiLayers },
];

export default function QuickActions() {
  return (
    <section className="app-card rounded-[24px] p-5 lg:p-6">
      <h2 className="text-lg font-bold text-slate-950">Acciones rápidas</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
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
      </div>
    </section>
  );
}
