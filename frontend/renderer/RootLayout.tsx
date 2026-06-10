import type { ReactNode } from "react";
import { usePageContext } from "./usePageContext";
import { AdminShell } from "@/apps/dashboard/AdminShell";
import { ProfileShell } from "@/apps/dashboard/ProfileShell";

// Routes that live inside the admin console shell (sidebar). Everything else
// (landing, /login, /register) renders its own chrome; /profile gets the
// standalone member shell.
const ADMIN_PREFIXES = ["/dashboard", "/leads", "/members", "/settings", "/add", "/history", "/odds"];

function isAdminRoute(pathname: string): boolean {
  return ADMIN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Persistent app layout, rendered by the renderer above the per-route Page.
 * Because RootLayout (and the shell it picks) is the same component across
 * client-side navigations, React keeps the shell mounted and only swaps the
 * Page - so the sidebar never remounts and the session is fetched once.
 */
export function RootLayout({ children }: { children: ReactNode }) {
  // pageContext.urlPathname is reliable on the server, but whether Vike exposes
  // it on the *client* pageContext varies by Vike version. Fall back to the
  // live location on the client so this never reads undefined (which crashed
  // hydration). On the server window is absent and urlPathname is always set.
  const { urlPathname } = usePageContext();
  const pathname =
    urlPathname ??
    (typeof window === "undefined" ? "/" : window.location.pathname);

  if (isAdminRoute(pathname)) {
    return <AdminShell pathname={pathname}>{children}</AdminShell>;
  }
  if (pathname === "/profile") {
    return <ProfileShell>{children}</ProfileShell>;
  }
  return <>{children}</>;
}
