import { useEffect, type ReactNode } from "react";
import { useCurrentUser } from "../auth";
import { AuthedUserProvider } from "../auth/current-user-context";
import { AppLayout } from "./AppLayout";
import { LoadingScreen, SignedOutScreen } from "./GateScreen";

const ROUTES: Record<string, { active: string; title: string }> = {
  "/dashboard": { active: "dashboard", title: "Home" },
  "/add":       { active: "add",       title: "Add Bet" },
  "/history":   { active: "history",   title: "My Bets" },
  "/odds":      { active: "odds",      title: "Live Odds" },
  "/leads":     { active: "leads",     title: "Leads" },
  "/members":   { active: "members",   title: "Members" },
  "/settings":  { active: "profile",   title: "Profile" },
  "/profile":   { active: "profile",   title: "Profile" },
};

function resolve(pathname: string): { active: string; title: string } {
  if (pathname.startsWith("/leads/")) return { active: "leads", title: "Lead" };
  return ROUTES[pathname] ?? { active: "dashboard", title: "Home" };
}

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

  const { active } = resolve(pathname);

  return (
    <AppLayout
      active={active}
      user={user}
      onSignOut={() => {
        void Promise.resolve(signOut()).then(() => {
          window.location.href = "/login";
        });
      }}
    >
      <AuthedUserProvider user={user}>{children}</AuthedUserProvider>
    </AppLayout>
  );
}
