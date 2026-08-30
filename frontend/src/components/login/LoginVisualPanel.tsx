import {
  FiArchive,
  FiCheckCircle,
  FiCpu,
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
    <aside className="login-panel-enter relative hidden min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_16%,rgba(45,212,191,0.30),transparent_22rem),radial-gradient(circle_at_76%_28%,rgba(14,165,233,0.34),transparent_24rem),radial-gradient(circle_at_54%_86%,rgba(37,99,235,0.38),transparent_30rem),linear-gradient(135deg,#02111f_0%,#05345a_48%,#075985_100%)] px-10 py-9 text-white lg:flex lg:flex-col xl:px-12">
      <DecorativeLayer />

      <div className="login-reveal-item relative z-10 flex items-center">
        <BrandMark
          logoSrc={logoFraudShield}
          size="lg"
          variant="plain"
          className="h-20 drop-shadow-[0_10px_18px_rgba(56,189,248,0.18)]"
        />
      </div>

      <div className="relative z-10 mt-10 grid flex-1 content-center gap-12 xl:mt-12">
        <div className="login-reveal-item login-reveal-delay-1">
          <h2 className="flex max-w-3xl flex-col gap-4 text-5xl font-bold leading-[1.18] tracking-tight xl:text-6xl xl:leading-[1.16]">
            <span className="login-type-line login-type-delay-1">
              Protegemos cada
            </span>
            <span className="login-type-line login-type-delay-2">
              <span className="bg-gradient-to-r from-cyan-200 via-blue-200 to-violet-200 bg-clip-text text-transparent">
                transaccion.
              </span>
            </span>
            <span className="login-type-line login-type-delay-3">
              Aseguramos tu
            </span>
            <span className="login-type-line login-type-delay-4">
              <span className="bg-gradient-to-r from-sky-200 to-cyan-100 bg-clip-text text-transparent">
                confianza.
              </span>
            </span>
          </h2>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-blue-100/82">
            Plataforma para el procesamiento por lotes, validacion y
            clasificacion automatica de transacciones digitales mediante
            reglas inteligentes.
          </p>
        </div>

        <div className="login-reveal-item login-reveal-delay-2 mt-5 grid max-w-5xl gap-3 xl:grid-cols-3">
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
      </div>

      <div className="login-reveal-item login-reveal-delay-4 relative z-10 flex items-center gap-3 text-sm text-blue-100/80">
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
      <div className="absolute inset-0 opacity-[0.11] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.08)_0%,transparent_24%,transparent_74%,rgba(56,189,248,0.08)_100%)]" />
      <svg
        viewBox="0 0 760 520"
        className="absolute -right-12 top-14 h-[430px] w-[630px] opacity-[0.14]"
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
        className="absolute bottom-16 left-6 h-64 w-[560px] opacity-[0.13]"
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

      <div className="login-orbit absolute left-[56%] top-[47%] h-72 w-72 rounded-full border border-cyan-300/14" />
      <div className="login-orbit login-orbit-slow absolute left-[50%] top-[42%] h-96 w-96 rounded-full border border-violet-300/10" />
      <div className="login-risk-card absolute left-[45%] right-[6%] top-[31%] h-64">
        <svg
          viewBox="0 0 460 190"
          className="absolute inset-x-0 bottom-0 h-full w-full opacity-80"
          aria-hidden="true"
        >
          <path
            d="M16 146 C88 78 140 168 214 96 C286 26 348 118 444 44"
            className="login-risk-line"
            fill="none"
            stroke="rgba(125, 211, 252, 0.72)"
            strokeLinecap="round"
            strokeWidth="4"
          />
          <path
            d="M16 146 C88 78 140 168 214 96 C286 26 348 118 444 44"
            fill="none"
            stroke="rgba(255, 255, 255, 0.16)"
            strokeLinecap="round"
            strokeWidth="12"
          />
        </svg>
        <div className="absolute inset-x-0 bottom-2 h-px bg-cyan-100/16" />
        <div className="absolute inset-x-0 bottom-[33%] h-px bg-cyan-100/10" />
        <div className="absolute inset-x-0 bottom-[66%] h-px bg-cyan-100/10" />
        <div className="absolute bottom-2 left-0 top-6 w-px bg-cyan-100/14" />
        <div className="absolute bottom-2 left-10 right-4 flex h-[12.5rem] items-end justify-between gap-5">
          <span className="login-risk-bar login-risk-bar-1 w-[18%] rounded-t-3xl bg-gradient-to-t from-sky-600/95 via-cyan-400/95 to-cyan-100 shadow-[0_0_34px_rgba(34,211,238,0.30)]" />
          <span className="login-risk-bar login-risk-bar-2 w-[18%] rounded-t-3xl bg-gradient-to-t from-blue-700/95 via-sky-400/95 to-blue-100 shadow-[0_0_36px_rgba(96,165,250,0.32)]" />
          <span className="login-risk-bar login-risk-bar-3 w-[18%] rounded-t-3xl bg-gradient-to-t from-teal-600/95 via-emerald-300/95 to-cyan-100 shadow-[0_0_34px_rgba(45,212,191,0.28)]" />
          <span className="login-risk-bar login-risk-bar-4 w-[18%] rounded-t-3xl bg-gradient-to-t from-indigo-700/95 via-blue-400/95 to-sky-100 shadow-[0_0_38px_rgba(129,140,248,0.30)]" />
        </div>
      </div>
    </div>
  );
}
