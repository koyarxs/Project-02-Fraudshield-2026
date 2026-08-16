import { FiDownload } from 'react-icons/fi';
import { CSV_TEMPLATE } from '../../utils/csvValidation';

export default function DownloadTemplateButton() {
  const handleDownload = () => {
    const blob = new Blob([CSV_TEMPLATE], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'plantilla_fraudshield_transacciones.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800"
    >
      <FiDownload className="h-4 w-4" aria-hidden="true" />
      Descargar plantilla CSV
    </button>
  );
}
