import { useEffect, useMemo, useState } from "react";
import {
  MoreHorizontal,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "../../api";
import { EmptyState, Spinner, StatCard } from "../../ui";
import { usersClient, type PublicUser } from "../users";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

export function MembersView({ currentUser }: { currentUser: PublicUser }) {
  const [members, setMembers] = useState<PublicUser[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<number[] | null>(null);

  async function load() {
    setLoadError("");
    try {
      setMembers(await usersClient.list());
    } catch (err) {
      setMembers([]);
      setLoadError(errorMessage(err, "Could not load members"));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (!members) return [];
    const term = search.trim().toLowerCase();
    if (!term) return members;
    return members.filter((m) =>
      [m.name, m.email]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(term)),
    );
  }, [members, search]);

  useEffect(() => {
    setSelected(new Set());
  }, [search]);

  const stats = useMemo(() => {
    const all = members ?? [];
    return { total: all.length, admins: all.filter((m) => m.isAdmin).length };
  }, [members]);

  // Only other members are bulk-removable; you can't delete yourself.
  const removable = filtered.filter((m) => m.id !== currentUser.id);
  const allSelected =
    removable.length > 0 && removable.every((m) => selected.has(m.id));
  const someSelected =
    !allSelected && removable.some((m) => selected.has(m.id));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (removable.every((m) => prev.has(m.id)) && removable.length > 0) {
        removable.forEach((m) => next.delete(m.id));
      } else {
        removable.forEach((m) => next.add(m.id));
      }
      return next;
    });
  }

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function toggleAdmin(member: PublicUser) {
    setBusy(true);
    try {
      const updated = await usersClient.setAdmin(member.id, !member.isAdmin);
      setMembers(
        (prev) => prev?.map((m) => (m.id === member.id ? updated : m)) ?? prev,
      );
      toast.success(
        updated.isAdmin ? "Promoted to admin" : "Admin access revoked",
      );
    } catch (err) {
      toast.error(errorMessage(err, "Could not change role"));
    } finally {
      setBusy(false);
    }
  }

  async function removeMembers(ids: number[]) {
    const targets = ids.filter((id) => id !== currentUser.id);
    setBusy(true);
    const results = await Promise.allSettled(
      targets.map((id) => usersClient.remove(id)),
    );
    const failures: string[] = [];
    let ok = 0;
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        ok++;
        return;
      }
      const id = targets[index];
      const member = members?.find((m) => m.id === id);
      failures.push(
        `${member?.email ?? id}: ${errorMessage(result.reason, "failed")}`,
      );
    });
    await load();
    setSelected(new Set());
    setPendingDelete(null);
    setBusy(false);
    if (failures.length) {
      toast.error(`Removed ${ok}. ${failures.length} could not be removed.`, {
        description: failures[0],
      });
    } else {
      toast.success(ok === 1 ? "Member removed" : `${ok} members removed`);
    }
  }

  const selectedIds = [...selected];

  if (members === null) {
    return (
      <div className="flex items-center gap-3 py-16 text-sm text-muted-foreground">
        <Spinner /> Loading members...
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard icon={Users} label="Members" value={stats.total} />
        <StatCard icon={ShieldCheck} label="Admins" value={stats.admins} />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or email..."
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => void load()}
            aria-label="Refresh"
          >
            <RefreshCw />
          </Button>
        </div>

        {selectedIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-2.5">
            <span className="text-sm font-medium text-foreground">
              {selectedIds.length} selected
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => setPendingDelete(selectedIds)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 />
                Remove
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
              icon={Users}
              title={
                members.length === 0 ? "No members yet" : "No matching members"
              }
              description={
                loadError ||
                (members.length === 0
                  ? "Registered users appear here."
                  : "Try a different search.")
              }
            />
          </div>
        ) : (
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
                    disabled={removable.length === 0}
                  />
                </TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden sm:table-cell">Joined</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((member) => {
                const isSelf = member.id === currentUser.id;
                return (
                  <TableRow
                    key={member.id}
                    data-state={
                      selected.has(member.id) ? "selected" : undefined
                    }
                  >
                    <TableCell>
                      <Checkbox
                        checked={selected.has(member.id)}
                        onCheckedChange={() => toggleOne(member.id)}
                        disabled={isSelf}
                        aria-label={`Select ${member.email}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="max-w-[14rem] truncate font-medium text-foreground">
                          {member.name || member.email}
                        </span>
                        {isSelf ? (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground"
                          >
                            You
                          </Badge>
                        ) : null}
                      </div>
                      {member.name ? (
                        <span className="block max-w-[16rem] truncate text-xs text-muted-foreground">
                          {member.email}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {member.isAdmin ? (
                        <Badge className="gap-1">
                          <ShieldCheck /> Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Shield /> Member
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                      {formatDate(member.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Member actions"
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            disabled={busy}
                            onClick={() => void toggleAdmin(member)}
                          >
                            {member.isAdmin ? (
                              <>
                                <ShieldOff /> Revoke admin
                              </>
                            ) : (
                              <>
                                <ShieldCheck /> Make admin
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={busy || isSelf}
                            onClick={() => setPendingDelete([member.id])}
                          >
                            <Trash2 /> Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove{" "}
              {pendingDelete?.length === 1
                ? "this member"
                : `${pendingDelete?.length} members`}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They lose access immediately. Their account and sessions are
              deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                if (pendingDelete) void removeMembers(pendingDelete);
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
