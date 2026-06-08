import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Inbox,
  Mail,
  MoreHorizontal,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "../../api";
import { EmptyState, Spinner, StatCard } from "../../ui";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type StatusFilter = LeadStatus | "ALL";

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  return err instanceof Error ? err.message : fallback;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function withinDays(iso: string, days: number): boolean {
  return Date.now() - new Date(iso).getTime() <= days * 24 * 60 * 60 * 1000;
}

export function LeadsView() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<number[] | null>(null);
  const lastClicked = useRef<number | null>(null);

  async function load() {
    setLoadError("");
    try {
      setLeads(await leadsClient.list());
    } catch (err) {
      setLeads([]);
      setLoadError(errorMessage(err, "Could not load leads"));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (!leads) return [];
    const term = search.trim().toLowerCase();
    return leads.filter((lead) => {
      if (statusFilter !== "ALL" && lead.status !== statusFilter) return false;
      if (!term) return true;
      return [lead.name, lead.email, lead.company, lead.message]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term));
    });
  }, [leads, search, statusFilter]);

  // Selection only ever refers to rows currently in view.
  useEffect(() => {
    setSelected(new Set());
    lastClicked.current = null;
  }, [search, statusFilter]);

  const stats = useMemo(() => {
    const all = leads ?? [];
    return {
      total: all.length,
      fresh: all.filter((l) => l.status === "NEW").length,
      week: all.filter((l) => withinDays(l.createdAt, 7)).length,
    };
  }, [leads]);

  const allSelected =
    filtered.length > 0 && filtered.every((l) => selected.has(l.id));
  const someSelected = !allSelected && filtered.some((l) => selected.has(l.id));

  function toggleOne(id: number, shiftKey: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      const ids = filtered.map((l) => l.id);
      if (shiftKey && lastClicked.current !== null) {
        const a = ids.indexOf(lastClicked.current);
        const b = ids.indexOf(id);
        if (a !== -1 && b !== -1) {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          for (let i = lo; i <= hi; i++) next.add(ids[i]!);
          lastClicked.current = id;
          return next;
        }
      }
      if (next.has(id)) next.delete(id);
      else next.add(id);
      lastClicked.current = id;
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (filtered.every((l) => prev.has(l.id)) && filtered.length > 0) {
        filtered.forEach((l) => next.delete(l.id));
      } else {
        filtered.forEach((l) => next.add(l.id));
      }
      return next;
    });
  }

  async function applyStatus(ids: number[], status: LeadStatus) {
    setBusy(true);
    try {
      if (ids.length === 1) await leadsClient.updateStatus(ids[0]!, status);
      else await leadsClient.bulkUpdateStatus(ids, status);
      setLeads(
        (prev) =>
          prev?.map((l) => (ids.includes(l.id) ? { ...l, status } : l)) ?? prev,
      );
      toast.success(
        ids.length === 1
          ? `Marked as ${leadStatusLabel(status)}`
          : `${ids.length} leads marked as ${leadStatusLabel(status)}`,
      );
      setSelected(new Set());
    } catch (err) {
      toast.error(errorMessage(err, "Could not update status"));
      void load();
    } finally {
      setBusy(false);
    }
  }

  async function applyDelete(ids: number[]) {
    setBusy(true);
    try {
      if (ids.length === 1) await leadsClient.delete(ids[0]!);
      else await leadsClient.bulkDelete(ids);
      setLeads((prev) => prev?.filter((l) => !ids.includes(l.id)) ?? prev);
      toast.success(
        ids.length === 1 ? "Lead deleted" : `${ids.length} leads deleted`,
      );
      setSelected(new Set());
    } catch (err) {
      toast.error(errorMessage(err, "Could not delete"));
      void load();
    } finally {
      setBusy(false);
      setPendingDelete(null);
    }
  }

  const selectedIds = [...selected];

  if (leads === null) {
    return (
      <div className="flex items-center gap-3 py-16 text-sm text-muted-foreground">
        <Spinner /> Loading leads...
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Inbox} label="Total leads" value={stats.total} />
        <StatCard
          icon={Mail}
          label="New"
          value={stats.fresh}
          hint="Awaiting first contact"
        />
        <StatCard
          icon={RefreshCw}
          label="This week"
          value={stats.week}
          hint="Last 7 days"
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, company, message..."
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {leadStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {leadStatusLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => void load()}
              aria-label="Refresh"
            >
              <RefreshCw />
            </Button>
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-2.5">
            <span className="text-sm font-medium text-foreground">
              {selectedIds.length} selected
            </span>
            <div className="ml-auto flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={busy}>
                    Set status
                    <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {leadStatuses.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => void applyStatus(selectedIds, status)}
                    >
                      {leadStatusLabel(status)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => setPendingDelete(selectedIds)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 />
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelected(new Set())}
              >
                Clear
              </Button>
            </div>
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title={leads.length === 0 ? "No leads yet" : "No matching leads"}
              description={
                loadError ||
                (leads.length === 0
                  ? "Submissions from your contact form land here."
                  : "Try a different search or status filter.")
              }
            />
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          allSelected
                            ? true
                            : someSelected
                              ? "indeterminate"
                              : false
                        }
                        onCheckedChange={toggleAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((lead) => (
                    <TableRow
                      key={lead.id}
                      data-state={
                        selected.has(lead.id) ? "selected" : undefined
                      }
                    >
                      <TableCell>
                        <Checkbox
                          checked={selected.has(lead.id)}
                          onClick={(event) =>
                            toggleOne(lead.id, event.shiftKey)
                          }
                          aria-label={`Select ${lead.email}`}
                        />
                      </TableCell>
                      <TableCell>
                        <LeadStatusBadge status={lead.status} />
                      </TableCell>
                      <TableCell>
                        <a
                          href={`/leads/${lead.id}`}
                          className="block max-w-[16rem] truncate font-medium text-foreground hover:underline"
                        >
                          {lead.name || lead.email}
                        </a>
                        {lead.name ? (
                          <span className="block max-w-[16rem] truncate text-xs text-muted-foreground">
                            {lead.email}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.company || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.source}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(lead.createdAt)}
                      </TableCell>
                      <TableCell>
                        <RowActions
                          lead={lead}
                          busy={busy}
                          onStatus={(status) =>
                            void applyStatus([lead.id], status)
                          }
                          onDelete={() => setPendingDelete([lead.id])}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y md:hidden">
              {filtered.map((lead) => (
                <li key={lead.id} className="flex items-start gap-3 p-3">
                  <Checkbox
                    checked={selected.has(lead.id)}
                    onClick={(event) => toggleOne(lead.id, event.shiftKey)}
                    aria-label={`Select ${lead.email}`}
                    className="mt-1"
                  />
                  <a href={`/leads/${lead.id}`} className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-foreground">
                        {lead.name || lead.email}
                      </span>
                      <LeadStatusBadge status={lead.status} />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {lead.email}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {lead.message}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {lead.company ? `${lead.company} · ` : ""}
                      {formatDate(lead.createdAt)}
                    </p>
                  </a>
                  <RowActions
                    lead={lead}
                    busy={busy}
                    onStatus={(status) => void applyStatus([lead.id], status)}
                    onDelete={() => setPendingDelete([lead.id])}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete{" "}
              {pendingDelete?.length === 1
                ? "this lead"
                : `${pendingDelete?.length} leads`}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes{" "}
              {pendingDelete?.length === 1 ? "the lead" : "the selected leads"}.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                if (pendingDelete) void applyDelete(pendingDelete);
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RowActions({
  lead,
  busy,
  onStatus,
  onDelete,
}: {
  lead: Lead;
  busy: boolean;
  onStatus: (status: LeadStatus) => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Lead actions">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <a href={`/leads/${lead.id}`}>View details</a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Mark as
        </DropdownMenuLabel>
        {leadStatuses.map((status) => (
          <DropdownMenuItem
            key={status}
            disabled={busy || status === lead.status}
            onClick={() => onStatus(status)}
          >
            {leadStatusLabel(status)}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={busy}
          onClick={onDelete}
        >
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
