import type { ReactNode } from "react";
import {
  CircleCheck,
  Info,
  OctagonAlert,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type NoticeTone = "info" | "success" | "warning" | "danger";

// Tinted inline message built on shadcn Alert. Used for form success/error and
// page-level feedback - tones track the theme tokens (success/warning/destructive).
const toneStyles: Record<NoticeTone, { box: string; icon: LucideIcon }> = {
  info: { box: "", icon: Info },
  success: {
    box: "border-success/30 text-success [&>svg]:text-success *:data-[slot=alert-description]:text-success/90",
    icon: CircleCheck,
  },
  warning: {
    box: "border-warning/35 text-warning [&>svg]:text-warning *:data-[slot=alert-description]:text-warning/90",
    icon: TriangleAlert,
  },
  danger: {
    box: "border-destructive/30 text-destructive [&>svg]:text-destructive *:data-[slot=alert-description]:text-destructive/90",
    icon: OctagonAlert,
  },
};

export function Notice({
  tone = "info",
  children,
  className,
}: {
  tone?: NoticeTone;
  children: ReactNode;
  className?: string;
}) {
  const { box, icon: Icon } = toneStyles[tone];
  return (
    <Alert className={cn(box, className)}>
      <Icon />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
