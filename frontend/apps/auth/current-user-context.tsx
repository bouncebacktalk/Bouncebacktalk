import { createContext, useContext, type ReactNode } from "react";
import type { CurrentUser } from "./auth";

// Provided by the authed shells (AdminShell / ProfileShell) so page content can
// read the resolved user without re-fetching or prop-drilling.
const Ctx = createContext<CurrentUser | null>(null);

export function AuthedUserProvider({
  user,
  children,
}: {
  user: CurrentUser;
  children: ReactNode;
}) {
  return <Ctx.Provider value={user}>{children}</Ctx.Provider>;
}

export function useAuthedUser(): CurrentUser {
  const user = useContext(Ctx);
  if (!user) {
    throw new Error(
      "useAuthedUser() must be used inside an authed shell (AdminShell / ProfileShell).",
    );
  }
  return user;
}
