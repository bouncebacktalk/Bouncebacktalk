import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: string;
}

/** KPI tile for the top of a dashboard. Duplicate it to add your own metrics. */
export function StatCard({ icon: Icon, label, value, hint }: StatCardProps) {
  return (
    <Card className="gap-0 py-5">
      <CardContent className="px-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            {label}
          </span>
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon aria-hidden="true" className="size-4" />
          </span>
        </div>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          {value}
        </p>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
