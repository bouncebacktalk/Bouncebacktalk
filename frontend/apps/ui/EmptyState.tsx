import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: ReactNode;
}

/** Friendly placeholder for empty lists and tables. */
export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: EmptyStateProps) {
  return (
    <div className="grid justify-items-center gap-3 rounded-xl border border-dashed bg-card px-4 py-12 text-center">
      <div className="grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
        <Icon aria-hidden="true" className="size-5" />
      </div>
      <div>
        <h3 className="font-medium text-foreground">{title}</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
