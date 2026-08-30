'use client';

import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

const ADMIN_ONLY_PATHS = ['/upload', '/audit'];

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname ?? '/')}`);
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-lg text-slate-600">Cargando...</p>
      </main>
    );
  }

  const requiresAdministrator = ADMIN_ONLY_PATHS.some(
    (path) => pathname === path || pathname?.startsWith(`${path}/`),
  );

  if (requiresAdministrator && user?.role !== 'ADMINISTRADOR') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5">
        <section className="w-full max-w-lg rounded-3xl border border-amber-200 bg-white p-7 text-center shadow-xl shadow-slate-200/70">
          <p className="text-sm font-bold uppercase text-amber-700">
            Acceso restringido
          </p>
          <h1 className="mt-3 text-2xl font-bold text-slate-950">
            Esta función requiere permisos de Administrador
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Tu sesión continúa activa. Puedes regresar a los módulos operacionales autorizados.
          </p>
          <button
            type="button"
            onClick={() => router.replace('/dashboard')}
            className="mt-6 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Volver al Dashboard
          </button>
        </section>
      </main>
    );
  }

  return children;
}
