import { useEffect, useState } from "react";
import { authClient, isUnauthorized, type CurrentUser } from "./auth";

// undefined = still loading, null = signed out, object = signed in.
export type SessionUser = CurrentUser | null | undefined;

/**
 * Resolve the current session once on mount. Encapsulates the me()/401/loading
 * dance so pages don't reimplement it. `error` is set only for unexpected
 * failures (not a plain 401, which just means "signed out").
 */
export function useCurrentUser() {
  const [user, setUser] = useState<SessionUser>(undefined);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    authClient
      .me()
      .then((u) => {
        if (active) setUser(u);
      })
      .catch((err) => {
        if (!active) return;
        if (isUnauthorized(err)) {
          setUser(null);
          return;
        }
        setError(
          err instanceof Error ? err.message : "Could not load your session",
        );
        setUser(null);
      });
    return () => {
      active = false;
    };
  }, []);

  async function signOut() {
    await authClient.logout().catch(() => undefined);
    setUser(null);
  }

  return { user, error, signOut };
}
