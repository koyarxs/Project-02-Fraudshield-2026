import {
  FiArchive,
  FiCheckCircle,
  FiCpu,
  FiLock,
  FiShield,
} from 'react-icons/fi';
import FeatureItem from './FeatureItem';
import BrandMark from '../ui/BrandMark';

interface LoginVisualPanelProps {
  logoFraudShield: string;
}

export default function LoginVisualPanel({
  logoFraudShield,
}: LoginVisualPanelProps) {
  return (
    <aside className="relative hidden min-h-[720px] overflow-hidden bg-[radial-gradient(circle_at_18%_15%,rgba(124,58,237,0.38),transparent_24rem),radial-gradient(circle_at_82%_25%,rgba(14,165,233,0.36),transparent_22rem),linear-gradient(135deg,#020617_0%,#071a45_48%,#0b2a78_100%)] px-10 py-9 text-white lg:flex lg:flex-col xl:px-12">
      <DecorativeLayer />

      <div className="relative z-10 flex items-center gap-4">
        <BrandMark
          logoSrc={logoFraudShield}
          size="lg"
          className="shadow-2xl shadow-blue-950/30"
        />
        <div>
          <p className="text-2xl font-bold tracking-tight">FraudShield</p>
          <p className="mt-1 max-w-xs text-sm font-medium text-blue-100/80">
            Gestion inteligente del riesgo transaccional
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-10 grid flex-1 content-center gap-9 xl:mt-12">
        <div>
          <h2 className="max-w-2xl text-5xl font-bold leading-[1.05] tracking-tight xl:text-6xl">
            Protegemos cada{' '}
            <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">
              transaccion.
            </span>
            <br />
            Aseguramos tu{' '}
            <span className="bg-gradient-to-r from-blue-300 to-violet-300 bg-clip-text text-transparent">
              confianza.
            </span>
          </h2>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-blue-100/82">
            Plataforma para el procesamiento por lotes, validacion y
            clasificacion automatica de transacciones digitales mediante
            reglas inteligentes.
          </p>
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          <FeatureItem
            icon={FiArchive}
            title="Procesamiento por lotes"
            description="Carga y analiza archivos CSV con flujo guiado."
          />
          <FeatureItem
            icon={FiCpu}
            title="Deteccion inteligente"
            description="Clasificacion con reglas de riesgo configuradas."
          />
          <FeatureItem
            icon={FiCheckCircle}
            title="Resultados y trazabilidad"
            description="Resumen visual para auditoria y seguimiento."
          />
        </div>

        <ShieldIllustration />
      </div>

      <div className="relative z-10 flex items-center gap-3 border-t border-white/10 pt-5 text-sm text-blue-100/80">
        <FiShield className="h-5 w-5 text-cyan-200" aria-hidden="true" />
        <span>
          Proyecto de Titulo · Ingenieria en Computacion e Informatica
        </span>
      </div>
    </aside>
  );
}

function DecorativeLayer() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 opacity-[0.13] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />
      <svg
        viewBox="0 0 760 520"
        className="absolute -right-20 top-12 h-[430px] w-[630px] opacity-[0.18]"
        aria-hidden="true"
      >
        <path
          d="M91 221c74-91 178-139 311-127 139 12 229 87 272 201"
          fill="none"
          stroke="white"
          strokeWidth="1"
        />
        <path
          d="M63 317c99-72 208-104 325-93 112 10 202 54 270 131"
          fill="none"
          stroke="#67e8f9"
          strokeWidth="1"
        />
        <path
          d="M121 154c52 42 107 63 166 63 69 0 133-29 193-86"
          fill="none"
          stroke="#a78bfa"
          strokeWidth="1"
        />
        <circle cx="182" cy="214" r="4" fill="#67e8f9" />
        <circle cx="511" cy="138" r="4" fill="#a78bfa" />
        <circle cx="638" cy="345" r="4" fill="#60a5fa" />
      </svg>

      <svg
        viewBox="0 0 700 360"
        className="absolute bottom-20 left-6 h-64 w-[560px] opacity-[0.11]"
        aria-hidden="true"
      >
        <path
          d="M34 176c48-28 92-35 132-21 33 11 68 29 105 53 52 33 108 32 168-4 45-27 88-41 130-43 42-3 74 9 97 35"
          fill="none"
          stroke="white"
          strokeWidth="2"
        />
        <path
          d="M76 231c49-22 95-24 138-5 49 22 93 51 132 87 54-58 113-92 178-103 48-9 86-2 114 22"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2"
        />
      </svg>

      <div className="login-orbit absolute left-[56%] top-[46%] h-72 w-72 rounded-full border border-cyan-300/15" />
      <div className="login-orbit login-orbit-slow absolute left-[50%] top-[40%] h-96 w-96 rounded-full border border-violet-300/10" />
      <div className="absolute bottom-36 right-14 rounded-2xl border border-white/10 bg-white/[0.08] p-4 shadow-2xl shadow-blue-950/30 backdrop-blur">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100/70">
          Riesgo
        </p>
        <div className="mt-3 flex h-16 items-end gap-2">
          <span className="h-8 w-3 rounded-full bg-emerald-300/80" />
          <span className="h-12 w-3 rounded-full bg-cyan-300/80" />
          <span className="h-6 w-3 rounded-full bg-violet-300/80" />
          <span className="h-14 w-3 rounded-full bg-blue-300/80" />
        </div>
      </div>
    </div>
  );
}

function ShieldIllustration() {
  return (
    <div className="relative mx-auto flex h-56 w-56 items-center justify-center xl:h-64 xl:w-64">
      <div className="absolute inset-0 rounded-full bg-cyan-300/10 blur-2xl" />
      <div className="absolute h-[78%] w-[78%] rounded-full border border-cyan-200/15" />
      <div className="absolute h-full w-full rounded-full border border-violet-200/10" />
      <div className="relative flex h-36 w-32 items-center justify-center rounded-[2.5rem] border border-white/15 bg-white/[0.11] shadow-2xl shadow-cyan-950/40 backdrop-blur">
        <svg
          viewBox="0 0 96 112"
          className="h-28 w-24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M48 8 17 20v27c0 24 12 43 31 55 19-12 31-31 31-55V20L48 8Z"
            fill="url(#shieldGradient)"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="2"
          />
          <path
            d="M34 51h28v24H34V51Z"
            fill="rgba(2,6,23,0.38)"
            stroke="white"
            strokeOpacity="0.65"
            strokeWidth="2"
          />
          <path
            d="M39 51v-8a9 9 0 0 1 18 0v8"
            stroke="white"
            strokeOpacity="0.8"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="m41 64 5 5 12-14"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient
              id="shieldGradient"
              x1="20"
              x2="80"
              y1="12"
              y2="96"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#22d3ee" />
              <stop offset="0.52" stopColor="#2563eb" />
              <stop offset="1" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <span className="absolute right-8 top-9 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-cyan-100 backdrop-blur">
        <FiLock className="h-5 w-5" aria-hidden="true" />
      </span>
    </div>
  );
}
