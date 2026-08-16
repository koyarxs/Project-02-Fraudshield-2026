import { useEffect, useRef, useState } from 'react';
import type { IconType } from 'react-icons';
import { useNavigate } from 'react-router-dom';
import {
  FiActivity,
  FiAlertCircle,
  FiCheckCircle,
  FiDatabase,
  FiImage,
  FiLogOut,
  FiMail,
  FiShield,
  FiTrash2,
  FiUpload,
  FiUser,
} from 'react-icons/fi';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../hooks/useAuth';
import { processingStoreService } from '../services/processing-store.service';
import { profilePhotoService } from '../services/profile-photo.service';
import { formatDate, formatNumber } from '../utils/formatDate';

const defaultProfilePhoto = '/assets/images/perfil-admin.png';
const SYSTEM_VERSION = '1.0.0';
const API_STATUS = 'Configurada';
const MAX_PHOTO_SIZE = 2 * 1024 * 1024;

export default function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, logout, isAuthenticated } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const [profilePhoto, setProfilePhoto] = useState(() =>
    profilePhotoService.get(defaultProfilePhoto),
  );
  const [photoNotice, setPhotoNotice] = useState<{
    tone: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const batches = processingStoreService.getAll();
  const displayName = user?.name || 'Administrador FraudShield';
  const email = user?.email || 'Correo no disponible';

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return profilePhotoService.subscribe(() => {
      setProfilePhoto(profilePhotoService.get(defaultProfilePhoto));
    });
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setPhotoNotice({
        tone: 'error',
        text: 'Selecciona una imagen válida en formato PNG, JPG o WebP.',
      });
      return;
    }

    if (file.size > MAX_PHOTO_SIZE) {
      setPhotoNotice({
        tone: 'error',
        text: 'La imagen debe pesar menos de 2 MB para guardarse en este navegador.',
      });
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setPhotoNotice({
          tone: 'error',
          text: 'No fue posible leer la imagen seleccionada.',
        });
        return;
      }

      profilePhotoService.save(reader.result);
      setProfilePhoto(reader.result);
      setPhotoNotice({
        tone: 'success',
        text: 'Foto de perfil actualizada correctamente.',
      });
    };

    reader.onerror = () => {
      setPhotoNotice({
        tone: 'error',
        text: 'No fue posible leer la imagen seleccionada.',
      });
    };

    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    profilePhotoService.remove();
    setProfilePhoto(null);
    setPhotoNotice({
      tone: 'info',
      text: 'Foto eliminada. Se mostrará el avatar predeterminado sin foto.',
    });
  };

  return (
    <DashboardLayout>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="app-card overflow-hidden rounded-[28px]">
          <div className="bg-white px-6 py-7 sm:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <ProfilePhotoFrame src={profilePhoto} />

                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                    Perfil del Administrador
                  </p>
                  <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                    {displayName}
                  </h2>
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                    <FiMail className="h-4 w-4" aria-hidden="true" />
                    {email}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <StatusPill
                      icon={FiShield}
                      label="Administrador"
                      tone="blue"
                    />
                    <StatusPill
                      icon={FiCheckCircle}
                      label={isAuthenticated ? 'Sesión activa' : 'Sesión inactiva'}
                      tone={isAuthenticated ? 'emerald' : 'slate'}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoUpload}
                  className="sr-only"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:bg-blue-800"
                >
                  <FiUpload className="h-4 w-4" aria-hidden="true" />
                  Subir foto
                </button>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  <FiTrash2 className="h-4 w-4" aria-hidden="true" />
                  Eliminar
                </button>
              </div>
            </div>

            {photoNotice ? (
              <div
                className={`mt-5 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
                  photoNotice.tone === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : photoNotice.tone === 'error'
                      ? 'border-red-200 bg-red-50 text-red-800'
                      : 'border-blue-200 bg-blue-50 text-blue-800'
                }`}
              >
                <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{photoNotice.text}</span>
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-200 px-6 py-6 sm:px-8">
            <div className="grid gap-4 lg:grid-cols-2">
              <ProfileDetailGroup
                title="Información Personal"
                description="Datos disponibles desde la sesión autenticada."
                items={[
                  ['Nombre completo', displayName],
                  ['Correo electrónico', email],
                  ['Rol', 'Administrador'],
                ]}
              />

              <ProfileDetailGroup
                title="Estado de Acceso"
                description="Control local de autenticación y sesión."
                items={[
                  ['Último acceso', 'Sesión actual'],
                  [
                    'Autenticación',
                    isAuthenticated ? 'JWT válido localmente' : 'Sin token',
                  ],
                  [
                    'Estado de sesión',
                    isAuthenticated ? 'Activa' : 'Inactiva',
                  ],
                ]}
              />
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-7 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              <FiLogOut className="h-4 w-4" aria-hidden="true" />
              Cerrar sesión
            </button>
          </div>
        </section>

        <section className="app-card rounded-[28px] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                Información del Sistema
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">
                FraudShield
              </h2>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
              <FiActivity className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>

          <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
            <SystemRow label="Nombre del sistema" value="FraudShield" />
            <SystemRow label="Versión del sistema" value={SYSTEM_VERSION} />
            <SystemRow label="Estado de conexión con la API" value={API_STATUS} />
            <SystemRow
              label="Estado de autenticación"
              value={isAuthenticated ? 'Autenticado' : 'No autenticado'}
            />
            <SystemRow label="Fecha y hora actual" value={formatDate(now.toISOString())} />
            <SystemRow
              label="Archivos procesados"
              value={formatNumber(batches.length)}
            />
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-blue-50 px-4 py-4 text-sm leading-6 text-blue-900 ring-1 ring-blue-100">
            <FiDatabase className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" aria-hidden="true" />
            <p>
              Los archivos procesados se calculan desde los resultados reales
              almacenados por el frontend durante cargas CSV completadas.
            </p>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

function ProfilePhotoFrame({ src }: { src: string | null }) {
  return (
    <div className="h-36 w-36 shrink-0 rounded-[2rem] bg-white p-2 shadow-2xl shadow-slate-900/12 ring-1 ring-slate-200">
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[1.5rem] bg-slate-50">
        {src ? (
          <img
            src={src}
            alt="Foto de perfil del administrador"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-white text-slate-400">
            <FiUser className="h-16 w-16" aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({
  icon: Icon,
  label,
  tone,
}: {
  icon: IconType;
  label: string;
  tone: 'blue' | 'emerald' | 'slate';
}) {
  const toneClass = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  }[tone];

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${toneClass}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </span>
  );
}

function ProfileDetailGroup({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: Array<[string, string]>;
}) {
  return (
    <section>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-blue-700">
          <FiImage className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-base font-bold text-slate-950">{title}</h3>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>

      <dl className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
        {items.map(([label, value]) => (
          <div
            key={label}
            className="grid gap-1 py-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center"
          >
            <dt className="text-sm text-slate-500">{label}</dt>
            <dd className="min-w-0 text-sm font-semibold text-slate-950">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function SystemRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-bold text-slate-950">{value}</span>
    </div>
  );
}
