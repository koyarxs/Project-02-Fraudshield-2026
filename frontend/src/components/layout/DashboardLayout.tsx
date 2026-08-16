import type { ReactNode } from 'react';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Navbar';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const headerContent =
    pageHeaders[location.pathname] ?? pageHeaders['/dashboard'];

  return (
    <div className="min-h-screen bg-transparent text-slate-900">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((current) => !current)}
      />

      <div
        className={`min-h-screen transition-[padding] duration-300 ease-out ${
          isSidebarCollapsed ? 'lg:pl-28' : 'lg:pl-72'
        }`}
      >
        <Header
          title={headerContent.title}
          subtitle={headerContent.subtitle}
        />

        <main className="px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

const pageHeaders: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': {
    title: 'Dashboard',
    subtitle:
      'Resumen general del procesamiento, clasificación y trazabilidad de transacciones.',
  },
  '/upload': {
    title: 'Carga de archivos',
    subtitle: 'Procesamiento de CSV mediante reglas R1-R5.',
  },
  '/transactions': {
    title: 'Transacciones procesadas',
    subtitle: 'Consulta y análisis de los registros procesados por lote.',
  },
  '/results': {
    title: 'Resultados',
    subtitle: 'Resumen de clasificación por lote procesado.',
  },
  '/history': {
    title: 'Historial',
    subtitle: 'Consulta y trazabilidad de archivos y lotes procesados.',
  },
  '/reports': {
    title: 'Reportes',
    subtitle: 'Exportación CSV sobre los datos visibles.',
  },
  '/profile': {
    title: 'Perfil del Administrador',
    subtitle: 'Información de sesión, usuario y estado del sistema.',
  },
};
