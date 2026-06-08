# 01 - Overview

bouncebacktalk_app is a full-stack web app: a React+Vike frontend with server-side rendering, a NestJS backend serving an API at `/api/*`, running on a NixOS-based Sky VM.

It starts **full-stack**: Postgres, Prisma, auth/users, Redis, BullMQ, queued password-reset emails, and React Email templates are wired on first boot. Build business logic immediately; remove services later only if you truly do not need them.

The frontend is built on **shadcn/ui** (new-york): a marketing landing (`/`), email-password auth (`/login`, `/register`), an **admin console** (`/dashboard`, `/leads` + `/leads/:id`, `/members`, `/settings`) behind a sidebar that collapses on desktop and becomes an off-canvas drawer on mobile, plus a standalone profile (`/profile`) for non-admin members. shadcn primitives live in `frontend/components/ui`; app-level compositions (form fields, stat cards, the shell, auth/role gates) live under `frontend/apps/*`; API/auth clients in `frontend/apps/api` and `frontend/apps/auth`. It calls relative `/api/*`; cookies are the primary auth transport, and a short-lived bearer fallback keeps PlayCode preview working when iframe cookie rules block HTTP-only cookies.

## Stack at a glance

| Layer | Technology | Status | Why |
|---|---|---|---|
| Edge router | Traefik v3 | Always on | Single port for all public traffic; clean path-based routing |
| Static assets | Caddy v2 | Always on | Fastest way to serve fingerprinted JS/CSS bundles |
| SSR + frontend | Vike + React + Tailwind v4 + shadcn/ui | Always on | First-paint speed, SEO, modern DX, batteries-included component kit |
| Backend API | NestJS | Always on | Module-per-feature structure, mature TypeScript ecosystem |
| Database | PostgreSQL 17 + Prisma | Always on | Persistent users and app data from the first prompt |
| Auth | JWT cookies + bearer preview fallback + refresh rotation | Always on | Register/login/logout/reset-password endpoints ready |
| Queues | Redis 7 + BullMQ | Always on | Background email jobs and a copyable queue pattern |
| Email templates | React Email + Tailwind | Always on | Password reset template renders HTML + text |
| Lint + format | OXC (oxlint + oxfmt) | Always on | Single Rust binary, fast, no ESLint/Prettier complexity |
| Tests | Vitest | Always on | Frontend (jsdom) + backend (Node) - same runner, same config |
| Process supervision | systemd | Always on | Auto-restart, journald logs, integrates with the OS |
| System config | NixOS flake | Always on | Declarative; `nixos-rebuild switch` is the one button to apply changes |

## Where things live

```
playcode-bouncebacktalk-app/
├── frontend/           # Vike app - pages, frontend apps, server entrypoint
├── frontend-spa/       # Browser-import only; absent in fresh full-stack projects
├── backend-nest/       # NestJS app - controllers, services, modules
├── nixos/              # flake.nix + modules (system config; one source of truth)
├── docs/               # You are here
├── .oxlintrc.json      # Lint config (oxlint)
├── .oxfmtrc.json       # Format config (oxfmt)
├── package.json        # Workspace root (pnpm)
└── pnpm-workspace.yaml
```

The `nixos/` directory is the source of truth for everything system-level: packages, systemd units, ports, and service enablement. Edit a module under `nixos/modules/` and run `sudo nixos-rebuild switch --flake /workspace/nixos#default --fast` to apply.

## What runs where

After deploy, the VM has these systemd-managed processes (see [02-architecture](02-architecture.md) for the full diagram):

| Process | Listens | Status | Purpose |
|---|---|---|---|
| `playcode-traefik` | `:3000` (public) | Always | Routes by path |
| `playcode-frontend` | `127.0.0.1:3010` | Always | Vike SSR |
| `playcode-backend` | `127.0.0.1:3011` | Always | NestJS API |
| `playcode-caddy` | `127.0.0.1:3012` | Always | Static asset bundles |
| `postgresql` | `127.0.0.1:5432` | Always | Database |
| `redis-server` | `127.0.0.1:6379` | Always | BullMQ queues |

Only Traefik is reachable from outside - everything else is bound to loopback.
