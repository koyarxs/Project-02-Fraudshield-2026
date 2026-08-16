import { FiDatabase } from 'react-icons/fi';
import type { ProcessingBatch } from '../../types/processing';

interface StorageEvidenceProps {
  batch?: ProcessingBatch;
}

export default function StorageEvidence({ batch }: StorageEvidenceProps) {
  return (
    <section className="rounded-[24px] border border-blue-200 bg-blue-50 p-5">
      <div className="flex items-start gap-3">
        <FiDatabase
          className="mt-0.5 h-5 w-5 shrink-0 text-blue-700"
          aria-hidden="true"
        />
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-blue-700">
            Información almacenada
          </h2>
          <p className="mt-2 text-sm leading-6 text-blue-900">
            {batch
              ? `Persistencia confirmada por el último lote: Batch #${batch.batchId}, archivo ${batch.fileName}.`
              : 'No hay evidencia de persistencia disponible hasta procesar un lote.'}
          </p>
        </div>
      </div>
    </section>
  );
}
