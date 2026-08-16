import DownloadTemplateButton from './DownloadTemplateButton';

const requiredColumns = [
  ['transactionCode', 'Código único de la transacción.'],
  ['customerCode', 'Código del cliente o usuario asociado.'],
  ['amount', 'Monto numérico, sin símbolos ni separadores de miles.'],
  ['transactionDate', 'Fecha en formato YYYY-MM-DD.'],
  ['transactionHour', 'Hora en formato HH:mm:ss o HH:mm.'],
];

const optionalColumns = [
  ['currency', 'Código de moneda, por ejemplo CLP.'],
  ['originLocation', 'Ubicación de origen.'],
  ['destinationLocation', 'Ubicación de destino.'],
];

export default function FileStructureGuide() {
  return (
    <aside className="space-y-4">
      <div className="app-card rounded-[24px] p-5">
        <h2 className="text-lg font-bold text-slate-950">
          Estructura requerida
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          El backend actual admite archivos CSV. JSON queda pendiente porque
          la API no expone soporte para ese formato.
        </p>

        <ColumnList title="Columnas obligatorias" items={requiredColumns} />
        <ColumnList title="Columnas opcionales" items={optionalColumns} />
      </div>

      <div className="rounded-[24px] border border-blue-200 bg-blue-50 p-5 shadow-sm">
        <h2 className="font-bold text-blue-950">Plantilla oficial</h2>
        <p className="mt-2 text-sm leading-6 text-blue-800">
          Descarga una plantilla compatible con los nombres reales esperados
          por el backend.
        </p>
        <div className="mt-5">
          <DownloadTemplateButton />
        </div>
      </div>

      <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-bold text-amber-950">Recomendaciones</h2>
        <p className="mt-2 text-sm leading-6 text-amber-800">
          Usa codificación UTF-8, una sola hoja exportada como CSV y montos
          sin puntos de miles.
        </p>
      </div>
    </aside>
  );
}

function ColumnList({
  title,
  items,
}: {
  title: string;
  items: string[][];
}) {
  return (
    <div className="mt-5">
      <h3 className="text-sm font-bold text-slate-950">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.map(([name, description]) => (
          <div
            key={name}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3"
          >
            <code className="text-sm font-bold text-blue-700">{name}</code>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              {description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
