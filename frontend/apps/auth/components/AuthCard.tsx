import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface AuthCardProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Shared layout for the sign-in / register screens so the auth surfaces stay
 * visually identical: one centered shadcn Card, a gradient brand mark, title,
 * and an optional cross-link footer.
 */
export function AuthCard({
  icon: Icon,
  title,
  subtitle,
  children,
  footer,
}: AuthCardProps) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 sm:py-24">
      <Card>
        <CardContent>
          <div className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm shadow-primary/25">
            <Icon aria-hidden="true" className="size-5" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
          {footer ? (
            <div className="mt-6 border-t pt-5 text-center text-sm text-muted-foreground">
              {footer}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
