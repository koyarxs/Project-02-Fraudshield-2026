import { NavLink } from 'react-router-dom';
import {
  FiBarChart2,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiFileText,
  FiGrid,
  FiLayers,
  FiList,
  FiLogOut,
  FiPieChart,
  FiUser,
  FiUploadCloud,
  FiActivity,
  FiX,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../services/auth.service';
import ChileLiveClock from '../history/ChileLiveClock';
import BrandMark from '../ui/BrandMark';

const logoFraudShieldCompact = '/assets/logo/logofraudshield-shield-hd.png';

interface SidebarItem {
  label: string;
  path: string;
  icon: IconType;
  roles?: UserRole[];
}

const navigationItems: SidebarItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: FiGrid },
  {
    label: 'Cargar archivos',
    path: '/upload',
    icon: FiUploadCloud,
    roles: ['ADMINISTRADOR'],
  },
  { label: 'Transacciones', path: '/transactions', icon: FiFileText },
  { label: 'Resultados', path: '/results', icon: FiBarChart2 },
  { label: 'Historial', path: '/history', icon: FiClock },
  { label: 'Gestión de casos', path: '/case-history', icon: FiLayers },
  { label: 'Listas de control', path: '/control-lists', icon: FiList },
  {
    label: 'Auditoría',
    path: '/audit',
    icon: FiActivity,
    roles: ['ADMINISTRADOR'],
  },
  { label: 'Reportes', path: '/reports', icon: FiPieChart },
  { label: 'Perfil', path: '/profile', icon: FiUser },
];

interface SidebarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onToggle: () => void;
  onMobileClose: () => void;
}

export default function Sidebar({
  isCollapsed,
  isMobileOpen,
  onToggle,
  onMobileClose,
}: SidebarProps) {
  const { logout, user } = useAuth();
  const visibleNavigationItems = navigationItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  const handleLogout = () => {
    logout();
  };
  const roleLabel =
    user?.role === 'ADMINISTRADOR'
      ? 'Administrador'
      : user?.role === 'ANALISTA'
        ? 'Analista'
        : 'Usuario';

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/45 transition-opacity md:hidden ${
          isMobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden="true"
        onClick={onMobileClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(21rem,calc(100vw-2rem))] max-w-full -translate-x-full flex-col overflow-y-auto border-r border-white/10 bg-[#071a35] text-white shadow-2xl shadow-slate-950/30 transition-transform duration-300 ease-out md:inset-y-0 md:left-0 md:z-40 md:translate-x-0 md:overflow-visible md:shadow-xl ${
          isMobileOpen ? 'translate-x-0' : ''
        } ${isCollapsed ? 'md:w-28' : 'md:w-72'}`}
        aria-label="Navegación principal"
      >
        <div
          className={`relative flex flex-col items-center gap-4 px-4 py-4 sm:px-6 md:px-4 md:py-7 ${
            isCollapsed ? 'md:flex-col md:items-center md:px-3' : 'md:block'
          }`}
        >
          <button
            type="button"
            onClick={onMobileClose}
            className="absolute right-4 top-4 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 md:hidden"
            aria-label="Cerrar menú"
            title="Cerrar menú"
          >
            <FiX className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="flex min-w-0 items-center justify-center md:hidden">
            <BrandMark
              logoSrc={logoFraudShieldCompact}
              size="lg"
              variant="plain"
              className="!h-24 max-w-full drop-shadow-[0_10px_18px_rgba(56,189,248,0.18)]"
            />
          </div>

          <div className="hidden min-w-0 items-center justify-center md:flex md:w-full">
            <BrandMark
              logoSrc={logoFraudShieldCompact}
              size="lg"
              variant="plain"
              className={`max-w-full drop-shadow-[0_10px_18px_rgba(56,189,248,0.18)] ${
                isCollapsed ? '!h-16 md:!h-[74px]' : '!h-24 md:!h-[104px]'
              }`}
            />
          </div>

          <button
            type="button"
            onClick={onToggle}
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white text-blue-950 shadow-xl shadow-blue-950/25 transition hover:-translate-y-0.5 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 md:absolute md:-right-5 md:top-7 md:flex"
            aria-label={isCollapsed ? 'Desplegar menú lateral' : 'Ocultar menú lateral'}
            title={isCollapsed ? 'Desplegar menú' : 'Ocultar menú'}
          >
            {isCollapsed ? (
              <FiChevronRight className="h-5 w-5" aria-hidden="true" />
            ) : (
              <FiChevronLeft className="h-5 w-5" aria-hidden="true" />
            )}
          </button>

          <div
            className={`hidden w-full max-w-[242px] shrink-0 transition-all duration-300 md:block ${
              isCollapsed ? 'md:w-full' : 'md:w-full'
            } md:mt-6`}
          >
            <ChileLiveClock
              variant="sidebar"
              compact={isCollapsed}
              framed={false}
            />
          </div>
        </div>

        <div className="mx-4 mb-2 px-4 md:hidden">
          <ChileLiveClock variant="sidebar" framed={false} />
        </div>

        <div className="mx-4 mb-3 flex min-w-0 items-center gap-3 px-4 py-2 text-blue-100 md:hidden">
          <FiUser className="h-5 w-5 shrink-0 text-cyan-200" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">
              {user?.name ?? user?.email ?? 'Usuario autenticado'}
            </p>
            <p className="mt-0.5 truncate text-xs font-semibold text-blue-100/80">
              {roleLabel}
            </p>
          </div>
        </div>

        <nav
          className={`flex flex-1 flex-col gap-2 px-4 pb-6 sm:px-6 md:px-4 ${
            isCollapsed ? 'md:items-center md:px-3' : ''
          }`}
        >
          {visibleNavigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onMobileClose}
                className={({ isActive }) =>
                  [
                    'group relative flex min-w-0 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold outline-none transition-all duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-cyan-200',
                    isCollapsed
                      ? 'md:h-12 md:w-12 md:justify-center md:px-0'
                      : '',
                    isActive
                      ? 'bg-white text-blue-950 shadow-lg shadow-blue-950/25'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white',
                  ].join(' ')
                }
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0 transition group-hover:scale-105" aria-hidden="true" />
                <span
                  className={`min-w-0 truncate transition-all duration-200 ${
                    isCollapsed
                      ? 'md:pointer-events-none md:absolute md:left-14 md:z-50 md:rounded-xl md:bg-slate-950 md:px-3 md:py-2 md:text-xs md:text-white md:opacity-0 md:shadow-xl md:group-hover:opacity-100'
                      : ''
                  }`}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className={`group relative flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-blue-100 transition hover:-translate-y-0.5 hover:bg-white/10 hover:text-white ${
              isCollapsed ? 'md:h-12 md:justify-center md:px-0' : ''
            }`}
            aria-label="Cerrar sesión"
            title={isCollapsed ? 'Cerrar sesión' : undefined}
          >
            <FiLogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span
              className={`min-w-0 truncate transition-all duration-200 ${
                isCollapsed
                  ? 'md:pointer-events-none md:absolute md:left-14 md:z-50 md:rounded-xl md:bg-slate-950 md:px-3 md:py-2 md:text-xs md:text-white md:opacity-0 md:shadow-xl md:group-hover:opacity-100'
                  : ''
              }`}
            >
              Cerrar sesión
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
