import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiCheckCircle, FiFileText, FiUploadCloud } from 'react-icons/fi';
import CsvPreview from '../components/upload/CsvPreview';
import DownloadTemplateButton from '../components/upload/DownloadTemplateButton';
import FileStructureGuide from '../components/upload/FileStructureGuide';
import ValidationErrors from '../components/upload/ValidationErrors';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../hooks/useAuth';
import fileProcessingService, {
  type FileProcessingResponse,
} from '../services/file-processing.service';
import { processingStoreService } from '../services/processing-store.service';
import { formatDate, formatFileSize } from '../utils/formatDate';
import {
  validateCsvContent,
  type CsvValidationResult,
} from '../utils/csvValidation';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function Upload() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user } = useAuth();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validation, setValidation] =
    useState<CsvValidationResult | null>(null);
  const [result, setResult] = useState<FileProcessingResponse | null>(null);
  const [processedFileName, setProcessedFileName] = useState('');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const validateAndSelectFile = async (file?: File) => {
    setError('');
    setResult(null);

    if (!file) {
      return;
    }

    if (selectedFile && selectedFile.name !== file.name) {
      const shouldReplace = window.confirm(
        'Ya hay un archivo seleccionado. ¿Deseas reemplazarlo?',
      );

      if (!shouldReplace) {
        return;
      }
    }

    const basicError = validateBasicFile(file);

    if (basicError) {
      setSelectedFile(null);
      setValidation(null);
      setError(basicError);
      return;
    }

    setIsReading(true);

    try {
      const content = await readFileAsText(file);
      const csvValidation = validateCsvContent(content);

      setSelectedFile(file);
      setValidation(csvValidation);

      if (!csvValidation.isValid) {
        setError('El archivo contiene errores de validación.');
      }
    } catch {
      setSelectedFile(null);
      setValidation(null);
      setError('No fue posible leer el archivo seleccionado.');
    } finally {
      setIsReading(false);
    }
  };

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    void validateAndSelectFile(event.target.files?.[0]);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const files = event.dataTransfer.files;

    if (files.length > 1) {
      setError('Solo se permite cargar un archivo por vez.');
      return;
    }

    void validateAndSelectFile(files[0]);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setValidation(null);
    setResult(null);
    setProcessedFileName('');
    setError('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleProcessFile = async () => {
    if (!selectedFile) {
      setError('Debe seleccionar un archivo CSV.');
      return;
    }

    if (!validation?.isValid) {
      setError('Corrige los errores del archivo antes de procesarlo.');
      return;
    }

    if (!user) {
      setError(
        'No fue posible obtener el usuario autenticado. Inicie sesión nuevamente.',
      );
      return;
    }

    setError('');
    setResult(null);
    setIsProcessing(true);

    try {
      const response = await fileProcessingService.uploadCsv(
        selectedFile,
        user.id,
      );

      processingStoreService.saveFromUpload(response, selectedFile);
      setProcessedFileName(selectedFile.name);
      setResult(response);
      setSelectedFile(null);
      setValidation(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <main className="min-h-screen">
        <header className="module-sticky-header mb-8 app-card rounded-[24px] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
            Carga de archivos
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Cargar archivo CSV
          </h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Selecciona un archivo de transacciones para validarlo y procesarlo
            mediante las reglas de riesgo R1–R5.
          </p>
        </header>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div>
            <section className="app-card rounded-[28px] p-5 sm:p-8">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex min-h-[330px] flex-col items-center justify-center rounded-[28px] border-2 border-dashed px-6 text-center transition duration-200 ${
                  isDragging
                    ? 'scale-[1.01] border-blue-500 bg-blue-50 shadow-inner shadow-blue-100'
                    : validation?.isValid
                      ? 'border-emerald-300 bg-emerald-50/40'
                      : selectedFile
                        ? 'border-red-300 bg-red-50/40'
                        : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40'
                }`}
              >
                <div
                  className={`flex h-20 w-20 items-center justify-center rounded-3xl ${
                    validation?.isValid
                      ? 'bg-emerald-100 text-emerald-600'
                      : selectedFile
                        ? 'bg-red-100 text-red-600'
                        : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  {selectedFile ? (
                    <FiFileText className="h-10 w-10" aria-hidden="true" />
                  ) : (
                    <FiUploadCloud className="h-10 w-10" aria-hidden="true" />
                  )}
                </div>

                {selectedFile ? (
                  <>
                    <h2 className="mt-6 text-xl font-bold text-slate-950">
                      Archivo seleccionado
                    </h2>
                    <p className="mt-2 break-all text-base font-semibold text-slate-700">
                      {selectedFile.name}
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-600 shadow-sm">
                        Formato CSV
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-600 shadow-sm">
                        {formatFileSize(selectedFile.size)}
                      </span>
                      {validation && (
                        <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-600 shadow-sm">
                          {validation.dataRowCount} filas
                        </span>
                      )}
                      {validation && (
                        <span
                          className={`rounded-full px-3 py-1 text-sm font-semibold shadow-sm ${
                            validation.isValid
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {validation.isValid
                            ? 'Validación correcta'
                            : 'Validación con errores'}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      disabled={isProcessing}
                      className="mt-6 min-h-11 text-sm font-semibold text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Quitar archivo
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                      className="mt-2 min-h-11 text-sm font-semibold text-blue-700 transition hover:text-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Seleccionar otro archivo
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="mt-6 text-2xl font-bold text-slate-950">
                      Arrastra tu archivo CSV aquí
                    </h2>
                    <p className="mt-3 max-w-md text-slate-600">
                      También puedes seleccionar el archivo directamente
                      desde tu computador.
                    </p>
                    <label className="mt-7 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-2xl bg-blue-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/25">
                      Seleccionar archivo
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </label>
                    <p className="mt-4 text-sm text-slate-500">
                      Formato admitido actualmente: CSV · Tamaño máximo: 10 MB
                    </p>
                  </>
                )}

                {selectedFile && (
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                    className="sr-only"
                    aria-label="Seleccionar otro archivo CSV"
                  />
                )}
              </div>

              {isReading && (
                <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm font-semibold text-blue-800">
                  Leyendo y validando archivo...
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              {validation && (
                <ValidationErrors errors={validation.errors} />
              )}

              {isProcessing && <ProcessingStatus />}

              <div className="mt-6 rounded-[24px] border border-blue-100 bg-blue-50 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-bold text-blue-950">
                      Plantilla CSV
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-blue-800">
                      Descarga un archivo base con los nombres de columnas
                      esperados.
                    </p>
                  </div>
                  <div className="sm:w-64">
                    <DownloadTemplateButton />
                  </div>
                </div>
              </div>

              {selectedFile && (
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={removeFile}
                    disabled={isProcessing}
                    className="min-h-11 rounded-2xl border border-slate-300 bg-white px-6 py-3.5 font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleProcessFile}
                    disabled={!validation?.isValid || isProcessing || isReading}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-700 to-cyan-500 px-6 py-3.5 font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/25 disabled:cursor-not-allowed disabled:translate-y-0 disabled:from-slate-400 disabled:to-slate-400 disabled:shadow-none"
                  >
                    {isProcessing ? 'Procesando...' : 'Procesar archivo'}
                  </button>
                </div>
              )}
            </section>

            {validation && <CsvPreview validation={validation} />}

            {result && (
              <ProcessingResult
                result={result}
                fileName={processedFileName}
                onReset={removeFile}
                onNavigate={navigate}
              />
            )}
          </div>

          <FileStructureGuide />
        </section>
      </main>
    </DashboardLayout>
  );
}

function ProcessingStatus() {
  return (
    <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-blue-950">Procesando archivo</p>
          <p className="mt-1 text-sm text-blue-700">
            FraudShield está registrando y clasificando las transacciones.
          </p>
        </div>
        <span className="h-7 w-7 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    </div>
  );
}

function ProcessingResult({
  result,
  fileName,
  onReset,
  onNavigate,
}: {
  result: FileProcessingResponse;
  fileName: string;
  onReset: () => void;
  onNavigate: (path: string) => void;
}) {
  return (
    <section className="mt-6 rounded-[28px] border border-emerald-200 bg-white p-5 shadow-lg shadow-emerald-100/60 sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <FiCheckCircle className="h-7 w-7" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">
              Procesamiento completado
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">
              {result.message}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {fileName} · {formatDate(new Date().toISOString())}
            </p>
            <p className="mt-3 text-sm font-semibold text-slate-700">
              {result.totalRecords.toLocaleString('es-CL')} registros
              procesados correctamente.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ResultCard label="Batch ID" value={`#${result.batchId}`} />
        <ResultCard
          label="Uploaded File ID"
          value={`#${result.uploadedFileId}`}
        />
        <ResultCard
          label="Total registros"
          value={result.totalRecords.toLocaleString('es-CL')}
        />
        <ResultCard
          label="Riesgos"
          value={`A ${result.dashboardMetric.highRiskCount} · M ${result.dashboardMetric.mediumRiskCount} · B ${result.dashboardMetric.lowRiskCount}`}
        />
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <ActionButton
          label="Ver resultados"
          onClick={() => onNavigate(`/results?batchId=${result.batchId}`)}
          variant="primary"
        />
        <ActionButton
          label="Consultar historial"
          onClick={() => onNavigate('/history')}
          variant="secondary"
        />
        <ActionButton
          label="Cargar otro archivo"
          onClick={onReset}
          variant="secondary"
        />
      </div>
    </section>
  );
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </article>
  );
}

function ActionButton({
  label,
  onClick,
  variant = 'primary',
}: {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-2xl px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${
        variant === 'primary'
          ? 'bg-blue-700 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-800'
          : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}

function validateBasicFile(file: File) {
  const hasValidName = file.name.trim().length > 0;
  const isCsv =
    file.name.toLowerCase().endsWith('.csv') &&
    (file.type === '' || file.type === 'text/csv');

  if (!hasValidName) {
    return 'El nombre del archivo no es válido.';
  }

  if (!isCsv) {
    return 'Solo se permiten archivos CSV.';
  }

  if (file.size === 0) {
    return 'El archivo está vacío.';
  }

  if (file.size > MAX_FILE_SIZE) {
    return 'El archivo supera los 10 MB.';
  }

  return '';
}

function readFileAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'utf-8');
  });
}

function getRequestErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return 'No fue posible procesar el archivo.';
  }

  const status = error.response?.status;
  const message = error.response?.data?.message;
  const apiMessage = Array.isArray(message) ? message.join(', ') : message;

  if (status === 400 || status === 422) {
    return apiMessage ?? 'El archivo no cumple con la estructura requerida.';
  }

  if (status === 401) {
    return 'Tu sesión expiró. Inicia sesión nuevamente.';
  }

  if (status === 403) {
    return 'No tienes permisos para procesar este archivo.';
  }

  if (status === 413) {
    return 'El archivo es demasiado grande para ser procesado.';
  }

  if (status && status >= 500) {
    return 'No fue posible procesar el archivo por un error del servidor.';
  }

  return apiMessage ?? 'No fue posible procesar el archivo.';
}
