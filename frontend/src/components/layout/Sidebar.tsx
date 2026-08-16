import { NavLink, useNavigate } from 'react-router-dom';
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
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { useAuth } from '../../hooks/useAuth';
import ChileLiveClock from '../history/ChileLiveClock';
import BrandMark from '../ui/BrandMark';

const logoFraudShield = '/assets/logo/logofraudshield-sidebar-hd.png';
const logoFraudShieldCompact = '/assets/logo/logofraudshield-shield-hd.png';

interface SidebarItem {
  label: string;
  path: string;
  icon: IconType;
}

const navigationItems: SidebarItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: FiGrid },
  { label: 'Cargar archivos', path: '/upload', icon: FiUploadCloud },
  { label: 'Transacciones', path: '/transactions', icon: FiFileText },
  { label: 'Resultados', path: '/results', icon: FiBarChart2 },
  { label: 'Historial', path: '/history', icon: FiClock },
  { label: 'Casos', path: '/case-history', icon: FiLayers },
  { label: 'Listas de control', path: '/control-lists', icon: FiList },
  { label: 'Auditoría', path: '/audit', icon: FiActivity },
  { label: 'Reportes', path: '/reports', icon: FiPieChart },
  { label: 'Perfil', path: '/profile', icon: FiUser },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      className={`border-b border-blue-900 bg-[#071a35] text-white shadow-xl shadow-slate-900/10 transition-all duration-300 ease-out lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r lg:border-white/10 ${
        isCollapsed ? 'lg:w-28' : 'lg:w-72'
      }`}
    >
      <div
        className={`relative flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-4 lg:py-7 ${
          isCollapsed ? 'lg:flex-col lg:items-center lg:px-3' : 'lg:block'
        }`}
      >
        <div className="flex w-full items-center justify-center">
          <BrandMark
            logoSrc={isCollapsed ? logoFraudShieldCompact : logoFraudShield}
            size="lg"
            variant="plain"
            className={`max-w-full drop-shadow-[0_10px_18px_rgba(56,189,248,0.18)] ${
              isCollapsed ? '!h-16 lg:!h-[74px]' : '!h-20 sm:!h-[86px] lg:!h-[92px]'
            }`}
          />
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white text-blue-950 shadow-xl shadow-blue-950/25 transition hover:-translate-y-0.5 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 lg:absolute lg:-right-5 lg:top-7 lg:flex"
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
          className={`w-[178px] shrink-0 transition-all duration-300 sm:w-[230px] ${
            isCollapsed ? 'lg:w-full' : 'lg:w-full'
          } lg:mt-6`}
        >
          <ChileLiveClock variant="sidebar" compact={isCollapsed} />
        </div>
      </div>

      <nav
        className={`flex gap-2 overflow-x-auto px-4 pb-4 sm:px-6 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-4 lg:pb-6 ${
          isCollapsed ? 'lg:items-center lg:px-3' : ''
        }`}
      >
        {navigationItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                [
                  'group relative flex min-w-max items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold outline-none transition-all duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-cyan-200',
                  isCollapsed
                    ? 'lg:h-12 lg:w-12 lg:min-w-0 lg:justify-center lg:px-0'
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
                className={`transition-all duration-200 ${
                  isCollapsed
                    ? 'lg:pointer-events-none lg:absolute lg:left-14 lg:z-50 lg:rounded-xl lg:bg-slate-950 lg:px-3 lg:py-2 lg:text-xs lg:text-white lg:opacity-0 lg:shadow-xl lg:group-hover:opacity-100'
                    : ''
                }`}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>

      <div className="hidden border-t border-white/10 p-4 lg:block">
        <button
          type="button"
          onClick={handleLogout}
          className={`group relative flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-blue-100 transition hover:-translate-y-0.5 hover:bg-white/10 hover:text-white ${
            isCollapsed ? 'lg:h-12 lg:justify-center lg:px-0' : ''
          }`}
          aria-label="Cerrar sesión"
          title={isCollapsed ? 'Cerrar sesión' : undefined}
        >
          <FiLogOut className="h-5 w-5" aria-hidden="true" />
          <span
            className={`transition-all duration-200 ${
              isCollapsed
                ? 'lg:pointer-events-none lg:absolute lg:left-14 lg:z-50 lg:rounded-xl lg:bg-slate-950 lg:px-3 lg:py-2 lg:text-xs lg:text-white lg:opacity-0 lg:shadow-xl lg:group-hover:opacity-100'
                : ''
            }`}
          >
            Cerrar sesión
          </span>
        </button>
      </div>
    </aside>
  );
}
