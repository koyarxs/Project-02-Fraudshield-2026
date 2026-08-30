import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Header from './Navbar';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="min-h-screen min-w-0 bg-transparent text-slate-900">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isMobileMenuOpen}
        onToggle={() => setIsSidebarCollapsed((current) => !current)}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      <div
        className={`min-h-screen min-w-0 transition-[padding] duration-300 ease-out ${
          isSidebarCollapsed ? 'md:pl-28' : 'md:pl-72'
        }`}
      >
        <Header
          isMobileMenuOpen={isMobileMenuOpen}
          onToggleMenu={() =>
            setIsMobileMenuOpen((currentIsOpen) => !currentIsOpen)
          }
        />

        <main className="min-w-0 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
