import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface RiskChartProps {
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
}

export default function RiskChart({
  highRiskCount,
  mediumRiskCount,
  lowRiskCount,
}: RiskChartProps) {
  const riskData = [
    { name: 'Alto', value: highRiskCount, color: '#ef4444' },
    { name: 'Medio', value: mediumRiskCount, color: '#f59e0b' },
    { name: 'Bajo', value: lowRiskCount, color: '#10b981' },
  ];
  const total = riskData.reduce((sum, item) => sum + item.value, 0);

  return (
    <section className="app-card rounded-[24px] p-5 text-left lg:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">
            Distribución de transacciones por nivel de riesgo
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            De un total de {total.toLocaleString('es-CL')} transacciones,{' '}
            {highRiskCount.toLocaleString('es-CL')} fueron clasificadas
            como riesgo alto, {mediumRiskCount.toLocaleString('es-CL')}{' '}
            como riesgo medio y {lowRiskCount.toLocaleString('es-CL')}{' '}
            como riesgo bajo.
          </p>
        </div>
      </div>

      {total === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm font-medium text-slate-500">
          No hay transacciones procesadas disponibles para graficar.
        </div>
      ) : (
      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(220px,1fr)_220px] md:items-center">
        <div className="h-72 min-h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                formatter={(value, name) => {
                  const numericValue = Number(value ?? 0);

                  return [
                    `${numericValue.toLocaleString('es-CL')} transacciones`,
                    String(name),
                  ];
                }}
              />
              <Pie
                data={riskData}
                dataKey="value"
                nameKey="name"
                innerRadius="62%"
                outerRadius="86%"
                paddingAngle={4}
                stroke="#ffffff"
                strokeWidth={4}
              >
                {riskData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3" aria-label="Leyenda de riesgo">
          {riskData.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm font-semibold text-slate-700">
                  Riesgo {item.name.toLowerCase()}
                </span>
              </div>
              <span className="text-sm font-bold text-slate-950">
                {item.value.toLocaleString('es-CL')} ·{' '}
                {Math.round((item.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
      )}
    </section>
  );
}
