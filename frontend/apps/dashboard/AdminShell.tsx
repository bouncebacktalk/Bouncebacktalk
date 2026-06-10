import { useEffect, type ReactNode } from "react";
import { useCurrentUser } from "../auth";
import { AuthedUserProvider } from "../auth/current-user-context";
import { DashboardLayout } from "./DashboardLayout";
import { LoadingScreen, SignedOutScreen } from "./GateScreen";

// Path -> sidebar active key + top-bar title. Derived from the URL so the
// persistent shell updates these on client navigation without remounting.
const ROUTES: Record<string, { active: string; title: string }> = {
  "/dashboard": { active: "dashboard", title: "Dashboard" },
  "/add": { active: "add", title: "Add Bet" },
  "/history": { active: "history", title: "Bet History" },
  "/odds": { active: "odds", title: "Live Odds" },
  "/leads": { active: "leads", title: "Leads" },
  "/members": { active: "members", title: "Members" },
  "/settings": { active: "settings", title: "Settings" },
};

function resolve(pathname: string): { active: string; title: string } {
  if (pathname.startsWith("/leads/")) return { active: "leads", title: "Lead" };
  return ROUTES[pathname] ?? { active: "", title: "Dashboard" };
}

/**
 * Persistent admin-console shell. Mounted once by the renderer's RootLayout and
 * kept mounted across client-side navigation, so the sidebar never remounts and
 * the session is fetched once. Gates to admins; guests -> /login, members ->
 * /profile. Page content renders as `children` and reads the user via context.
 */
export function AdminShell({
  pathname,
  children,
}: {
  pathname: string;
  children: ReactNode;
}) {
  const { user, error, signOut } = useCurrentUser();

  useEffect(() => {
    if (error) return;
    if (user === null) window.location.href = "/login";
    else if (user && !user.isAdmin) window.location.href = "/profile";
  }, [user, error]);

  if (error) return <SignedOutScreen message={error} />;
  if (user === undefined) return <LoadingScreen />;
  if (user === null) return <LoadingScreen label="Redirecting to sign in..." />;
  if (!user.isAdmin) return <LoadingScreen label="Redirecting..." />;

  const { active, title } = resolve(pathname);

  return (
    <DashboardLayout
      active={active}
      title={title}
      user={user}
      onSignOut={() => {
        void Promise.resolve(signOut()).then(() => {
          window.location.href = "/login";
        });
      }}
    >
      <AuthedUserProvider user={user}>{children}</AuthedUserProvider>
    </DashboardLayout>
  );
}
