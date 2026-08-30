import type { IconType } from 'react-icons';

interface FeatureItemProps {
  icon: IconType;
  title: string;
  description: string;
}

export default function FeatureItem({
  icon: Icon,
  title,
  description,
}: FeatureItemProps) {
  return (
    <article className="group rounded-2xl border border-cyan-100/14 bg-slate-950/18 p-4 shadow-lg shadow-blue-950/20 backdrop-blur transition hover:-translate-y-0.5 hover:border-cyan-200/35 hover:bg-white/[0.10] hover:shadow-cyan-950/25">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/25 bg-cyan-300/12 text-cyan-100 shadow-inner shadow-white/10">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-blue-100/80">
            {description}
          </p>
        </div>
      </div>
    </article>
  );
}
