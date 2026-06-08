import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { leadStatusLabel, type LeadStatus } from "../leads";

// Status -> tone, using the theme tokens so it tracks light/dark.
const toneClass: Record<LeadStatus, string> = {
  NEW: "border-primary/30 bg-primary/10 text-primary",
  CONTACTED: "border-success/30 bg-success/10 text-success",
  ARCHIVED: "bg-muted text-muted-foreground",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge variant="outline" className={cn(toneClass[status])}>
      {leadStatusLabel(status)}
    </Badge>
  );
}
