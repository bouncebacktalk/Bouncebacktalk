import type { ReactNode } from "react";
import { Spinner } from "../ui";
import { Button } from "@/components/ui/button";

/** Full-viewport centered container for auth-gate fallback states. */
export function CenteredScreen({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 px-4">
      {children}
    </div>
  );
}

export function LoadingScreen({ label = "Loading..." }: { label?: string }) {
  return (
    <CenteredScreen>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Spinner />
        {label}
      </div>
    </CenteredScreen>
  );
}

export function SignedOutScreen({ message }: { message?: string }) {
  return (
    <CenteredScreen>
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">Signed out</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {message || "Your session has ended."}
        </p>
        <Button asChild className="mt-5">
          <a href="/login">Sign in again</a>
        </Button>
      </div>
    </CenteredScreen>
  );
}
