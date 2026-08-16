import { useState, type FormEvent } from 'react';
import axios from 'axios';
import {
  FiArrowRight,
  FiLoader,
  FiMail,
  FiShield,
} from 'react-icons/fi';
import PasswordInput from './PasswordInput';

interface LoginFormProps {
  logoUnab: string;
  onLogin: (credentials: { email: string; password: string }) => Promise<void>;
}

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function LoginForm({ logoUnab, onLogin }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors = validateFields(email, password);
    setFieldErrors(validationErrors);
    setServerError('');

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onLogin({ email, password });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message;

        setServerError(
          Array.isArray(message)
            ? message.join(', ')
            : message ?? 'No fue posible iniciar sesion.',
        );
      } else {
        setServerError('Ocurrio un error inesperado.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-form-enter mx-auto w-full max-w-[520px]">
      <div className="mb-9">
        <div className="inline-flex items-center gap-3 rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-blue-700">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
            <FiShield className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="text-xs font-bold uppercase tracking-[0.24em]">
            Acceso seguro
          </p>
        </div>

        <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          Iniciar sesion
        </h1>

        <p className="mt-4 max-w-md text-base leading-7 text-slate-600">
          Ingresa tus credenciales para acceder a la plataforma
          FraudShield.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label
            htmlFor="email"
            className="mb-2.5 block text-sm font-semibold text-slate-800"
          >
            Correo electronico
          </label>

          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <FiMail className="h-5 w-5" aria-hidden="true" />
            </span>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="usuario@fraudshield.cl"
              required
              disabled={isSubmitting}
              autoComplete="email"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              className="h-14 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-4 text-base text-slate-900 outline-none shadow-sm transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </div>

          {fieldErrors.email && (
            <p id="email-error" className="mt-2 text-sm text-red-600">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <PasswordInput
          value={password}
          error={fieldErrors.password}
          showPassword={showPassword}
          disabled={isSubmitting}
          onChange={setPassword}
          onToggleVisibility={() => setShowPassword((current) => !current)}
        />

        {serverError && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-medium text-red-700 shadow-sm"
          >
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="group flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-violet-600 px-5 font-semibold text-white shadow-xl shadow-blue-500/25 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-blue-500/30 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:translate-y-0 disabled:from-slate-400 disabled:via-slate-400 disabled:to-slate-400 disabled:shadow-none"
        >
          {isSubmitting ? (
            <>
              <FiLoader className="h-5 w-5 animate-spin" aria-hidden="true" />
              Ingresando...
            </>
          ) : (
            <>
              Iniciar sesion
              <FiArrowRight
                className="h-5 w-5 transition group-hover:translate-x-1"
                aria-hidden="true"
              />
            </>
          )}
        </button>
      </form>

      <div className="mt-12">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-200" />
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-500">
            Proyecto academico
          </p>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="mt-7 flex justify-center">
          <img
            src={logoUnab}
            alt="Logo de la Universidad Andres Bello"
            className="h-20 w-auto object-contain sm:h-24"
          />
        </div>
      </div>
    </div>
  );
}

function validateFields(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};

  if (!email.trim()) {
    errors.email = 'Ingresa tu correo electronico.';
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = 'Ingresa un correo electronico valido.';
  }

  if (!password) {
    errors.password = 'Ingresa tu contrasena.';
  }

  return errors;
}
