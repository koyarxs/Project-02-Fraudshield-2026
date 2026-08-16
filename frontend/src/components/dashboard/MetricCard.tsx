import type { IconType } from 'react-icons';

export type MetricTone = 'blue' | 'red' | 'amber' | 'emerald' | 'cyan';

interface MetricCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: IconType;
  tone: MetricTone;
}

const toneClasses: Record<MetricTone, string> = {
  blue: 'border-blue-100 bg-blue-50 text-blue-700',
  red: 'border-red-100 bg-red-50 text-red-700',
  amber: 'border-amber-100 bg-amber-50 text-amber-700',
  emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  cyan: 'border-cyan-100 bg-cyan-50 text-cyan-700',
};

const indicatorClasses: Record<MetricTone, string> = {
  blue: 'bg-blue-600',
  red: 'bg-red-500',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  cyan: 'bg-cyan-500',
};

export default function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
}: MetricCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 text-left shadow-sm shadow-slate-200/70 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80">
      <span className={`absolute inset-x-0 top-0 h-1 ${indicatorClasses[tone]}`} />
      <span className="absolute right-0 top-0 h-24 w-24 rounded-full bg-slate-100/70 blur-2xl transition group-hover:bg-blue-100/70" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-600">
            {title}
          </p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            {typeof value === 'number'
              ? value.toLocaleString('es-CL')
              : value}
          </p>
        </div>

        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-sm transition group-hover:scale-105 ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <p className="relative mt-4 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </article>
  );
}
