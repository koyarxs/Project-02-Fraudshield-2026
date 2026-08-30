import LoginForm from '../components/login/LoginForm';
import LoginVisualPanel from '../components/login/LoginVisualPanel';
import { useAuth } from '../hooks/useAuth';

const logoFraudShield = '/assets/logo/logofraudshield-transparent.png';
const logoFraudShieldShield = '/assets/logo/logofraudshield-shield-hd.png';
const logoUnab = '/assets/logo/logounab.png';

export default function Login() {
  const { login } = useAuth();

  const handleLogin = async (credentials: {
    email: string;
    password: string;
  }) => {
    await login(credentials);
    window.location.replace(getPostLoginDestination());
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_18%,rgba(34,211,238,0.22),transparent_26rem),radial-gradient(circle_at_92%_85%,rgba(59,130,246,0.18),transparent_30rem),linear-gradient(135deg,#020617_0%,#071a45_46%,#eef6ff_46%,#ffffff_100%)]">
      <div className="pointer-events-none absolute -left-48 top-0 h-[32rem] w-[32rem] rounded-full bg-blue-700/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-52 right-0 h-[34rem] w-[34rem] rounded-full bg-violet-600/16 blur-3xl" />

      <section className="relative grid min-h-screen w-full overflow-hidden bg-[#071a35] shadow-2xl shadow-blue-950/30 lg:grid-cols-[55fr_45fr] lg:bg-white">
        <LoginVisualPanel logoFraudShield={logoFraudShield} />

        <div className="relative z-10 flex min-h-screen items-center bg-[radial-gradient(circle_at_18%_8%,rgba(34,211,238,0.18),transparent_18rem),linear-gradient(180deg,#071a35_0%,#0b2446_100%)] px-5 py-9 sm:px-10 lg:bg-[radial-gradient(circle_at_82%_18%,rgba(219,234,254,0.9),transparent_20rem),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] lg:px-14 xl:px-20">
          <div className="login-mobile-science-bg absolute inset-0 lg:hidden" aria-hidden="true" />
          <div className="relative z-10 w-full">
            <div className="mb-10 flex flex-col items-center justify-center gap-2 lg:hidden">
              <img
                src={logoFraudShieldShield}
                alt=""
                aria-hidden="true"
                className="h-24 w-auto object-contain"
              />
              <p className="text-3xl font-extrabold leading-none tracking-normal">
                <span className="text-white">Fraud</span>
                <span className="text-cyan-300">Shield</span>
              </p>
            </div>

            <LoginForm logoUnab={logoUnab} onLogin={handleLogin} />
          </div>
        </div>
      </section>
    </main>
  );
}

function getPostLoginDestination() {
  const requestedPath = new URLSearchParams(window.location.search).get('next');

  if (
    !requestedPath ||
    !requestedPath.startsWith('/') ||
    requestedPath.startsWith('//') ||
    requestedPath.startsWith('/login')
  ) {
    return '/dashboard';
  }

  return requestedPath;
}
