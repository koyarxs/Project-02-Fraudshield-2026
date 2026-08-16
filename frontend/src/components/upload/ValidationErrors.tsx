interface ValidationErrorsProps {
  errors: string[];
}

export default function ValidationErrors({ errors }: ValidationErrorsProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div
      role="alert"
      className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      <p className="font-bold">Corrige los siguientes problemas:</p>
      <ul className="mt-2 list-inside list-disc space-y-1">
        {errors.slice(0, 12).map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
      {errors.length > 12 && (
        <p className="mt-2 font-semibold">
          Hay {errors.length - 12} errores adicionales.
        </p>
      )}
    </div>
  );
}
