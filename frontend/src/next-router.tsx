'use client';

import NextLink from 'next/link';
import {
  redirect,
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams,
} from 'next/navigation';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

type NavigateOptions = {
  replace?: boolean;
};

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  to: string;
  children: ReactNode;
};

type NavLinkProps = Omit<LinkProps, 'className'> & {
  className?:
    | string
    | ((state: { isActive: boolean }) => string);
};

export function Link({ to, children, ...props }: LinkProps) {
  return (
    <NextLink href={to} {...props}>
      {children}
    </NextLink>
  );
}

export function NavLink({
  to,
  className,
  children,
  ...props
}: NavLinkProps) {
  const pathname = usePathname();
  const isActive =
    pathname === to ||
    (to !== '/' && Boolean(pathname?.startsWith(`${to}/`)));
  const resolvedClassName =
    typeof className === 'function' ? className({ isActive }) : className;

  return (
    <NextLink href={to} className={resolvedClassName} {...props}>
      {children}
    </NextLink>
  );
}

export function useNavigate() {
  const router = useRouter();

  return (to: string, options?: NavigateOptions) => {
    if (options?.replace) {
      router.replace(to);
      return;
    }

    router.push(to);
  };
}

export function useLocation() {
  const pathname = usePathname();

  return {
    pathname,
  };
}

export function useSearchParams() {
  const searchParams = useNextSearchParams();

  return [searchParams] as const;
}

export function Navigate({
  to,
}: {
  to: string;
  replace?: boolean;
}) {
  redirect(to);
}

export function BrowserRouter({ children }: { children: ReactNode }) {
  return children;
}

export function Routes({ children }: { children: ReactNode }) {
  return children;
}

export function Route() {
  return null;
}

export function Outlet() {
  return null;
}
