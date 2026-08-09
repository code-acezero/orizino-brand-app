"use client";

import * as React from "react";
import NextLink from "next/link";
import {
  usePathname,
  useSearchParams as useNextSearchParams,
  useRouter as useNextRouter,
  useParams as useNextParams,
} from "next/navigation";

export function Outlet() {
  return null;
}

export const Link: any = React.forwardRef<HTMLAnchorElement, any>(
  ({ to, href, children, ...rest }, ref) => {
    const dest = to ?? href ?? "/";
    return (
      <NextLink ref={ref} href={dest} {...rest}>
        {children}
      </NextLink>
    );
  }
);
Link.displayName = "Link";

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const router = useNextRouter();
  React.useEffect(() => {
    if (replace) router.replace(to);
    else router.push(to);
  }, [to, replace, router]);
  return null;
}

export const NavLink: any = React.forwardRef<HTMLAnchorElement, any>(
  ({ to, href, end, className, children, activeClassName, ...rest }, ref) => {
    const pathname = usePathname();
    const dest = to ?? href ?? "/";
    const isActive = end ? pathname === dest : pathname.startsWith(dest);
    const resolvedClassName = typeof className === "function" ? className({ isActive }) : className;
    const finalClassName = isActive && activeClassName ? `${resolvedClassName ?? ""} ${activeClassName}`.trim() : resolvedClassName;
    return (
      <NextLink ref={ref} href={dest} className={finalClassName} {...rest}>
        {children}
      </NextLink>
    );
  }
);
NavLink.displayName = "NavLink";

export function useNavigate() {
  const router = useNextRouter();
  return React.useCallback(
    (to: any, options?: { replace?: boolean; state?: unknown }) => {
      const dest = typeof to === "string" ? to : to?.to || "/";
      if (options?.replace) router.replace(dest);
      else router.push(dest);
    },
    [router]
  );
}

export function useParams<T extends Record<string, string | undefined> = any>(): T {
  const params = useNextParams();
  return (params ?? {}) as T;
}

export function useLocation() {
  const pathname = usePathname() || "/";
  const searchParams = useNextSearchParams();
  const search = searchParams ? `?${searchParams.toString()}` : "";
  return {
    pathname,
    search,
    hash: "",
    state: null,
    key: "default",
  };
}

export function useSearchParams(): [
  URLSearchParams,
  (
    next: URLSearchParams | Record<string, string> | ((p: URLSearchParams) => URLSearchParams | Record<string, string>),
    opts?: { replace?: boolean }
  ) => void
] {
  const searchParams = useNextSearchParams();
  const router = useNextRouter();
  const pathname = usePathname();

  const params = React.useMemo(() => {
    return new URLSearchParams(searchParams ? searchParams.toString() : "");
  }, [searchParams]);

  const setParams = React.useCallback(
    (next: any, opts?: { replace?: boolean }) => {
      const resolved = typeof next === "function" ? next(params) : next;
      const sp = resolved instanceof URLSearchParams ? resolved : new URLSearchParams(resolved as Record<string, string>);
      const query = sp.toString();
      const dest = query ? `${pathname}?${query}` : pathname;
      if (opts?.replace) router.replace(dest);
      else router.push(dest);
    },
    [router, pathname, params]
  );

  return [params, setParams];
}

export function matchPath(_pattern: any, _pathname: string) {
  return null;
}

export function ClientOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}

export function useSearch<T = Record<string, string>>(): T {
  const searchParams = useNextSearchParams();
  const res: Record<string, string> = {};
  if (searchParams) {
    searchParams.forEach((v, k) => {
      res[k] = v;
    });
  }
  return res as T;
}

export function useRouter() {
  const router = useNextRouter();
  return router;
}

export function createFileRoute(_path: string) {
  return (config: any) => config;
}

export function redirect(opts: any) {
  return opts;
}
