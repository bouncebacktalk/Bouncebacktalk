import { useEffect, type ReactNode } from "react";
import { LogOut } from "lucide-react";
import { useCurrentUser } from "../auth";
import { AuthedUserProvider } from "../auth/current-user-context";
import { Brand } from "./Brand";
import { LoadingScreen, SignedOutScreen } from "./GateScreen";
import { ThemeToggle } from "../ui/ThemeToggle";
import { Button } from "@/components/ui/button";

/**
 * Persistent standalone shell for a signed-in member (any role): a slim top bar
 * (brand + theme + sign out) and a centered column, intentionally without the
 * admin sidebar. Guests -> /login. Page content reads the user via context.
 */
export function ProfileShell({ children }: { children: ReactNode }) {
  const { user, error, signOut } = useCurrentUser();

  useEffect(() => {
    if (!error && user === null) window.location.href = "/login";
  }, [user, error]);

  if (error) return <SignedOutScreen message={error} />;
  if (user === undefined) return <LoadingScreen />;
  if (user === null) return <LoadingScreen label="Redirecting to sign in..." />;

  return (
    <div className="flex min-h-screen flex-col bg-muted/30 text-foreground">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur sm:px-6">
        <a href="/" className="flex items-center gap-2.5">
          <Brand />
        </a>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void Promise.resolve(signOut()).then(() => {
                window.location.href = "/login";
              });
            }}
          >
            <LogOut aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Your account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your profile and password.
          </p>
        </div>
        <AuthedUserProvider user={user}>{children}</AuthedUserProvider>
      </main>
    </div>
  );
}
