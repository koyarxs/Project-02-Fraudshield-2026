import { useEffect, useState } from 'react';
import { FiUser } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { profilePhotoService } from '../../services/profile-photo.service';
import BrandMark from '../ui/BrandMark';
import NotificationBell from './NotificationBell';

const defaultProfilePhoto = '/assets/images/perfil-admin.png';
const logoFraudShieldShield = '/assets/logo/logofraudshield-shield-hd.png';

interface HeaderProps {
  isMobileMenuOpen: boolean;
  onToggleMenu: () => void;
}

export default function Header({
  isMobileMenuOpen,
  onToggleMenu,
}: HeaderProps) {
  const { user } = useAuth();
  const displayName = user?.name || user?.email || 'Usuario autenticado';
  const [profilePhoto, setProfilePhoto] = useState(() =>
    profilePhotoService.get(defaultProfilePhoto),
  );

  useEffect(() => {
    return profilePhotoService.subscribe(() => {
      setProfilePhoto(profilePhotoService.get(defaultProfilePhoto));
    });
  }, []);

  return (
    <header className="sticky top-0 z-30 min-w-0 border-b border-slate-200/80 bg-white/85 px-3 py-3 shadow-sm shadow-slate-200/40 backdrop-blur-xl sm:px-6 sm:py-4 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl min-w-0 items-center gap-2 sm:gap-4">
        <div className="flex min-w-0 shrink-0 items-center gap-1.5">
          <BrandMark
            logoSrc={logoFraudShieldShield}
            size="sm"
            variant="plain"
            className="h-11 w-auto"
          />
          <span className="whitespace-nowrap text-lg font-extrabold leading-none tracking-normal">
            <span className="text-blue-950">Fraud</span>
            <span className="text-cyan-500">Shield</span>
          </span>
        </div>

        <div className="ml-auto flex min-w-0 shrink-0 items-center justify-end gap-2 sm:gap-3">
          <NotificationBell />
          <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:px-3 sm:py-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-blue-700 shadow-md shadow-slate-900/10 ring-1 ring-slate-200">
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FiUser className="h-5 w-5" aria-hidden="true" />
                )}
              </span>
              <div className="hidden min-w-0 md:block">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {displayName}
                </p>
                <p className="text-xs text-slate-500">
                  Sesión activa
                </p>
              </div>
          </div>
          <button
            type="button"
            onClick={onToggleMenu}
            className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 md:hidden"
            aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={isMobileMenuOpen}
            title={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            <span
              className={`absolute h-0.5 w-5 rounded-full bg-current transition-transform duration-200 ${
                isMobileMenuOpen ? 'translate-y-0 rotate-45' : '-translate-y-1.5'
              }`}
            />
            <span
              className={`absolute h-0.5 w-5 rounded-full bg-current transition-opacity duration-200 ${
                isMobileMenuOpen ? 'opacity-0' : 'opacity-100'
              }`}
            />
            <span
              className={`absolute h-0.5 w-5 rounded-full bg-current transition-transform duration-200 ${
                isMobileMenuOpen ? 'translate-y-0 -rotate-45' : 'translate-y-1.5'
              }`}
            />
          </button>
        </div>
      </div>
    </header>
  );
}
