import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/login/LoginForm';
import LoginVisualPanel from '../components/login/LoginVisualPanel';
import BrandMark from '../components/ui/BrandMark';
import { useAuth } from '../hooks/useAuth';

const logoFraudShield = '/assets/logo/logofraudshield.png';
const logoUnab = '/assets/logo/logounab.png';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (credentials: {
    email: string;
    password: string;
  }) => {
    await login(credentials);
    navigate('/dashboard');
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020817] px-3 py-3 sm:px-6 sm:py-6 lg:px-8">
      <div className="pointer-events-none absolute -left-48 top-0 h-[32rem] w-[32rem] rounded-full bg-blue-700/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-52 right-0 h-[34rem] w-[34rem] rounded-full bg-violet-600/16 blur-3xl" />

      <section className="relative mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-[1540px] overflow-hidden rounded-[32px] border border-blue-300/20 bg-white shadow-2xl shadow-blue-950/40 sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[55fr_45fr]">
        <LoginVisualPanel logoFraudShield={logoFraudShield} />

        <div className="flex min-h-[calc(100vh-1.5rem)] items-center bg-white px-5 py-9 sm:min-h-[calc(100vh-3rem)] sm:px-10 lg:min-h-[720px] lg:px-14 xl:px-20">
          <div className="w-full">
            <div className="mb-8 flex justify-center lg:hidden">
              <BrandMark
                logoSrc={logoFraudShield}
                size="lg"
                className="shadow-xl shadow-blue-200/50"
              />
            </div>

            <LoginForm logoUnab={logoUnab} onLogin={handleLogin} />
          </div>
        </div>
      </section>
    </main>
  );
}
