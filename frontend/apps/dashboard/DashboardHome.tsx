import { useEffect, useState } from "react";
import {
  ArrowRight,
  Inbox,
  Mail,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { StatCard } from "../ui";
import { leadsClient, LeadStatusBadge, type Lead } from "../leads";
import { usersClient, type PublicUser } from "../users";
import type { CurrentUser } from "../auth";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function withinDays(iso: string, days: number): boolean {
  return Date.now() - new Date(iso).getTime() <= days * 24 * 60 * 60 * 1000;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const QUICK_ACTIONS = [
  {
    href: "/leads",
    icon: Inbox,
    label: "Manage leads",
    hint: "Review and triage submissions",
  },
  {
    href: "/members",
    icon: Users,
    label: "Manage members",
    hint: "Roles and access",
  },
  {
    href: "/settings",
    icon: Settings,
    label: "Account settings",
    hint: "Profile and password",
  },
];

export function DashboardHome({ user }: { user: CurrentUser }) {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [members, setMembers] = useState<PublicUser[] | null>(null);

  useEffect(() => {
    let active = true;
    void leadsClient
      .list()
      .then((value) => active && setLeads(value))
      .catch(() => active && setLeads([]));
    void usersClient
      .list()
      .then((value) => active && setMembers(value))
      .catch(() => active && setMembers([]));
    return () => {
      active = false;
    };
  }, []);

  const loading = leads === null || members === null;
  const stats = {
    leads: leads?.length ?? 0,
    fresh: leads?.filter((l) => withinDays(l.createdAt, 7)).length ?? 0,
    members: members?.length ?? 0,
    admins: members?.filter((m) => m.isAdmin).length ?? 0,
  };
  const recent = (leads ?? []).slice(0, 5);

  return (
    <div className="grid gap-6">
      <p className="text-sm text-muted-foreground">
        Welcome back,{" "}
        <span className="font-medium text-foreground">
          {user.name || user.email}
        </span>
        .
      </p>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {["leads", "week", "members", "admins"].map((key) => (
            <Skeleton key={key} className="h-[104px] rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Inbox} label="Total leads" value={stats.leads} />
          <StatCard
            icon={Mail}
            label="New this week"
            value={stats.fresh}
            hint="Last 7 days"
          />
          <StatCard icon={Users} label="Members" value={stats.members} />
          <StatCard icon={ShieldCheck} label="Admins" value={stats.admins} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <Card>
          <CardHeader>
            <CardTitle>Recent leads</CardTitle>
            <CardDescription>The latest contact submissions.</CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <a href="/leads">
                  View all
                  <ArrowRight />
                </a>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid gap-3">
                {["r1", "r2", "r3", "r4"].map((key) => (
                  <Skeleton key={key} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No leads yet. Submissions from your contact form land here.
              </p>
            ) : (
              <ul className="-mx-2 grid">
                {recent.map((lead) => (
                  <li key={lead.id}>
                    <a
                      href={`/leads/${lead.id}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-muted"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {lead.name || lead.email}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {lead.email}
                        </p>
                      </div>
                      <LeadStatusBadge status={lead.status} />
                      <span className="w-12 shrink-0 text-right text-xs text-muted-foreground">
                        {formatDate(lead.createdAt)}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Jump into a tool.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {QUICK_ACTIONS.map((action) => (
              <a
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 rounded-lg border p-3 transition hover:bg-muted"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <action.icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    {action.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {action.hint}
                  </span>
                </span>
                <ArrowRight className="size-4 text-muted-foreground" />
              </a>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
