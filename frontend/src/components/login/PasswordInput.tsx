import { FiEye, FiEyeOff, FiLock } from 'react-icons/fi';

interface PasswordInputProps {
  value: string;
  error?: string;
  showPassword: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
  onToggleVisibility: () => void;
}

export default function PasswordInput({
  value,
  error,
  showPassword,
  disabled,
  onChange,
  onToggleVisibility,
}: PasswordInputProps) {
  return (
    <div>
      <label
        htmlFor="password"
        className="mb-2.5 block text-sm font-semibold text-blue-50 lg:text-slate-800"
      >
        Contrasena
      </label>

      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
          <FiLock className="h-5 w-5" aria-hidden="true" />
        </span>

        <input
          id="password"
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Ingresa tu contrasena"
          required
          disabled={disabled}
          autoComplete="current-password"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'password-error' : undefined}
          className="h-14 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-14 text-base text-slate-900 outline-none shadow-sm transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
        />

        <button
          type="button"
          onClick={onToggleVisibility}
          disabled={disabled}
          aria-label={
            showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'
          }
          className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 transition hover:text-blue-600 focus:outline-none focus-visible:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {showPassword ? (
            <FiEyeOff className="h-5 w-5" aria-hidden="true" />
          ) : (
            <FiEye className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {error && (
        <p id="password-error" className="mt-2 text-sm text-red-200 lg:text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
