import type { CsvValidationResult } from '../../utils/csvValidation';

interface CsvPreviewProps {
  validation: CsvValidationResult;
}

export default function CsvPreview({ validation }: CsvPreviewProps) {
  return (
    <section className="mt-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">
            Vista previa del archivo
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {validation.dataRowCount} filas de datos detectadas.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${
            validation.isValid
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
              : 'bg-red-50 text-red-700 ring-red-100'
          }`}
        >
          {validation.isValid ? 'Validación correcta' : 'Revisar errores'}
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <InfoList title="Columnas detectadas" items={validation.headers} />
        <InfoList
          title="Columnas faltantes"
          items={
            validation.missingColumns.length > 0
              ? validation.missingColumns
              : ['Ninguna']
          }
        />
      </div>

      {validation.previewRows.length > 0 && (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-[760px] divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Fila
                </th>
                {validation.headers.map((header) => (
                  <th
                    key={header}
                    className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {validation.previewRows.map((row) => (
                <tr key={row.rowNumber}>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                    {row.rowNumber}
                  </td>
                  {validation.headers.map((header) => (
                    <td
                      key={`${row.rowNumber}-${header}`}
                      className="whitespace-nowrap px-4 py-3 text-sm text-slate-600"
                    >
                      {row.values[header] || 'No disponible'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-bold text-slate-950">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
