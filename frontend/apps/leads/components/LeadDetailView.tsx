import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Mail,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "../../api";
import { EmptyState, Notice, Spinner } from "../../ui";
import {
  leadStatusLabel,
  leadStatuses,
  leadsClient,
  type Lead,
  type LeadStatus,
} from "../leads";
import { LeadStatusBadge } from "./LeadStatusBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function LeadDetailView({ id }: { id: number }) {
  const [lead, setLead] = useState<Lead | null | undefined>(undefined);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!Number.isFinite(id)) {
      setLead(null);
      return;
    }
    leadsClient
      .get(id)
      .then((value) => active && setLead(value))
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 404) {
          setLead(null);
          return;
        }
        setError(err instanceof Error ? err.message : "Could not load lead");
        setLead(null);
      });
    return () => {
      active = false;
    };
  }, [id]);

  async function setStatus(status: LeadStatus) {
    if (!lead) return;
    setBusy(true);
    try {
      const updated = await leadsClient.updateStatus(lead.id, status);
      setLead(updated);
      toast.success(`Marked as ${leadStatusLabel(status)}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update status",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!lead) return;
    setBusy(true);
    try {
      await leadsClient.delete(lead.id);
      toast.success("Lead deleted");
      window.location.href = "/leads";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete lead");
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5">
      <a
        href="/leads"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to leads
      </a>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      {lead === undefined ? (
        <div className="flex items-center gap-3 py-10 text-sm text-muted-foreground">
          <Spinner /> Loading lead...
        </div>
      ) : lead === null ? (
        <EmptyState
          title="Lead not found"
          description="This lead may have been deleted."
          action={
            <Button asChild variant="outline" size="sm">
              <a href="/leads">Back to leads</a>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="grid gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">
                    {lead.name || lead.email}
                  </h2>
                  <LeadStatusBadge status={lead.status} />
                </div>
                <a
                  href={`mailto:${lead.email}`}
                  className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <Mail className="size-3.5" />
                  {lead.email}
                </a>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Select
                  value={lead.status}
                  onValueChange={(value) => void setStatus(value as LeadStatus)}
                  disabled={busy}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {leadStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {leadStatusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={busy}
                      aria-label="Delete lead"
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently removes {lead.email}. This cannot be
                        undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={busy}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        disabled={busy}
                        onClick={(event) => {
                          event.preventDefault();
                          void remove();
                        }}
                        className="bg-destructive text-white hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <Separator />

            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <DetailRow
                icon={Building2}
                label="Company"
                value={lead.company || "-"}
              />
              <DetailRow icon={Tag} label="Source" value={lead.source} />
              <DetailRow
                icon={CalendarClock}
                label="Received"
                value={formatDateTime(lead.createdAt)}
              />
              <DetailRow
                icon={CalendarClock}
                label="Last updated"
                value={formatDateTime(lead.updatedAt)}
              />
            </dl>

            <div>
              <h3 className="text-sm font-medium text-foreground">Message</h3>
              <p className="mt-2 whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 text-sm leading-6 text-foreground">
                {lead.message}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="truncate text-sm font-medium text-foreground">
          {value}
        </dd>
      </div>
    </div>
  );
}
