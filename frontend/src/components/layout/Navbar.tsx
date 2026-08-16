import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLogOut, FiUser } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { profilePhotoService } from '../../services/profile-photo.service';

const defaultProfilePhoto = '/assets/images/perfil-admin.png';

interface HeaderProps {
  title: string;
  subtitle: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const displayName = user?.name || user?.email || 'Usuario autenticado';
  const [profilePhoto, setProfilePhoto] = useState(() =>
    profilePhotoService.get(defaultProfilePhoto),
  );

  useEffect(() => {
    return profilePhotoService.subscribe(() => {
      setProfilePhoto(profilePhotoService.get(defaultProfilePhoto));
    });
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 px-4 py-4 shadow-sm shadow-slate-200/40 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
            <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
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
              <div className="min-w-0">
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
              onClick={handleLogout}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 lg:hidden"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <FiLogOut className="h-5 w-5" aria-hidden="true" />
            </button>
        </div>
      </div>
    </header>
  );
}
