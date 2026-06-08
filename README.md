# bouncebacktalk_app

A full-stack web app: **Vike + React + Tailwind** frontend, **NestJS** backend, running on a NixOS VM.

## Mental model - read this first

This project runs on a **permanent NixOS computer**, not a Docker container. Three things follow from that, and they shape everything else:

1. **The disk persists.** Files you create, lockfiles, anything written to disk - it all stays across stops, restarts, suspends, and chat sessions. There is no `docker rm -v` to wipe state. The only way to roll back system-level state is via a snapshot (in the editor's history panel).

2. **NixOS is the source of truth.** Every package, every systemd unit, every config file under `/etc` - lives in [`nixos/`](nixos/) (`flake.nix` + the modules in [`nixos/modules/`](nixos/modules/)). Don't `apt install foo` ad-hoc - that breaks on NixOS and silently diverges configurations. Add the package or service to a module and rebuild. **Reason:** the same flake builds dev and prod VMs. Declarative config means `nixos-rebuild switch` is the one button you press to make a system change real.

3. **Snapshots are the rollback button.** Before a risky operation (DB migration, mass refactor, dependency bump, anything you can't easily undo by hand), take a snapshot. They're whole-VM and atomic to restore.

## Default shape: full-stack

Out of the box bouncebacktalk_app is a starter for SaaS products and internal tools, built on **shadcn/ui**: a marketing landing, an admin console behind a sidebar (collapsible on desktop, off-canvas drawer on mobile) with KPI cards, a full leads CRM and member management, a standalone member profile, email-password auth with admin roles, a public contact form, plus Postgres, Prisma, Redis, BullMQ, and queued React Email templates.

The starter includes a working public path, an admin console, and a member surface:

| Path | Purpose |
|---|---|
| `/` | Marketing landing: hero, feature cards, and the working contact form |
| `/login` / `/register` | Email-password auth (redirects by role after sign-in) |
| `/dashboard` | Admin console home: KPI cards, recent leads, quick actions (admin only) |
| `/leads` + `/leads/:id` | Leads CRM: search/filter, multi-select, bulk actions, detail page (admin only) |
| `/members` | Member management: roles, remove, bulk (admin only) |
| `/settings` | The admin's own account (profile + password) |
| `/profile` | Standalone account page for non-admin members |
| `/api/leads` | Public contact submit plus admin CRM endpoints |

Browser code calls relative `/api/*` URLs; Traefik routes those to NestJS. Cookies are primary, and a short-lived bearer fallback keeps PlayCode preview usable when iframe cookie rules block HTTP-only cookies.

```
                            ┌───────────────────────┐
   user ──── HTTPS ────►    │ Traefik :3000         │  edge router
                            └─────┬─────────────────┘
                                  │
                  ┌───────────────┼───────────────┐
                  │               │               │
                  ▼               ▼               ▼
          ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
          │ NestJS :3011 │  │ Caddy :3012  │  │ Vike  :3010  │
          │  (/api/*)    │  │ (/assets/*)  │  │ everything   │
          │ Prisma/Auth  │  │  static-only │  │ else (SSR)   │
          └──────────────┘  └──────────────┘  └──────────────┘
                  │
          ┌───────┴───────┐
          ▼               ▼
    ┌──────────┐    ┌──────────┐
    │ Postgres │    │  Redis   │
    │  :5432   │    │  :6379   │
    └──────────┘    └──────────┘
```

| Process | Port | systemd unit |
|---|---|---|
| Traefik | 3000 | `traefik.service` |
| Vike (frontend) | 3010 | `playcode-frontend.service` |
| NestJS (backend) | 3011 | `playcode-backend.service` |
| Caddy (static) | 3012 | `caddy.service` |
| Postgres | 5432 | `postgresql.service` |
| Redis | 6379 | `redis.service` |

## Environment files

Per-service env files live at `/etc/playcode-app/<unit>.env` and are owned by NixOS - they're rendered from `nixos/modules/app.nix` at activation. Add service-level defaults by editing that module and running `nixos-rebuild switch`.

`setup.sh` creates `.env.local` once with `DATABASE_URL`, `REDIS_URL`, JWT secrets, `ADMIN_EMAILS`, and mail defaults. `.env.local` is gitignored and loaded by `playcode-backend.service`; do not commit it. Edit it for third-party API keys, production mail settings, and extra admin access.

The first registered user becomes admin automatically, similar to Ghost-style self-hosted setup. Add extra or recovery admins with a comma-separated list:

```env
ADMIN_EMAILS=founder@example.com,ops@example.com
```

Prisma CLI commands load `.env.local` from the workspace root, so these work from `backend-nest/` after setup:

```bash
pnpm prisma:migrate        # dev migration; app role has CREATEDB in dev mode for Prisma shadow DB
pnpm prisma:migrate:deploy # production-safe migration apply
pnpm prisma:studio
```

The app role is not responsible for creating production databases. `playcode-postgresql-configure-app.service` runs as the local `postgres` superuser, creates the role/database idempotently, applies the password from `.env.local`, and grants `CREATEDB` only while `playcode.services.mode = "dev"`. `deploy.sh` restarts that service before migrations, so a prod VM forked from a dev snapshot converges before `prisma migrate deploy`.

If `DATABASE_URL` is missing, Prisma commands fail with an explicit setup error instead of trying a placeholder database.

## Folder layout

| Path | Purpose |
|---|---|
| `frontend/` | Vike + React + Tailwind v4 + shadcn/ui. Fresh full-stack projects serve this by default. `+Page.tsx` files in `pages/` are auto-routed; shadcn primitives live in `components/ui` with `cn()` in `lib/utils`; `apps/api`, `apps/auth`, `apps/dashboard`, `apps/users`, `apps/contact`, `apps/leads`, and `apps/ui` are the starter app modules. |
| `frontend-spa/` | Only present for browser-imported projects. When it exists and provisioning passes `SPA_MODE=true`, Traefik serves this Vite SPA instead of `frontend/`. |
| `backend-nest/` | NestJS API: config, logger, Prisma, auth/users, email, queue |
| `nixos/` | NixOS flake + modules. Edit a module, run `nixos-rebuild switch`. |
| `docs/` | Numbered topic docs (see [Documentation](#documentation)). |

## Documentation

Project docs live in [`docs/`](docs/) as short numbered files, each focused on one topic. Read what's relevant to the task you're about to work on; update the same file when the topic changes.

| Doc | What's in it |
|---|---|
| [docs/01-overview.md](docs/01-overview.md) | What this app does, the stack, where everything lives |
| [docs/02-architecture.md](docs/02-architecture.md) | Full-stack runtime architecture: frontend, backend, Postgres, Redis, queue |
| [docs/03-deploy.md](docs/03-deploy.md) | How to apply system changes (`nixos-rebuild switch`), how to roll back |
| [docs/04-dev-guide.md](docs/04-dev-guide.md) | Developing inside the VM: which unit to restart for what change, where logs are |
| [docs/05-nestjs-conventions.md](docs/05-nestjs-conventions.md) | `forwardRef` + dual-import discipline that prevents circular-dep crashes |
| [docs/06-auth-and-email.md](docs/06-auth-and-email.md) | JWT auth, queued password reset, React Email templates, email transport |
| [docs/07-building-apps.md](docs/07-building-apps.md) | Copy/delete recipes for API, UI primitives, contact form, leads CRM, tests |

**Conventions:**
- Numbered prefix so files stay in narrative order in any file tree
- Each doc starts with a one-paragraph "what's in it" summary, then sections
- Link relatively (`./03-deploy.md`) so links survive folder moves
- **Update this README's table when you add or remove a doc** - the root README is the single index

## Develop

The project opens inside a VM with the configured systemd services running. To work on a layer, restart its unit:

```bash
sudo systemctl restart playcode-frontend     # after frontend changes
sudo systemctl restart playcode-backend      # after backend changes
sudo systemctl restart traefik               # after routing changes
sudo systemctl restart caddy                 # after Caddyfile changes

# Logs
sudo journalctl -u playcode-frontend -f
sudo journalctl -u playcode-backend -f
```

## Lint, format, test

OXC for lint + format (single Rust binary, fast). Vitest for tests.

```bash
pnpm lint                 # oxlint across the whole repo
pnpm format               # oxfmt - rewrites files in place
pnpm format:check         # oxfmt - non-mutating, exits non-zero if anything would change
pnpm typecheck            # tsc --noEmit on every package
pnpm test                 # vitest run, both packages
pnpm test:smoke           # starts temp Postgres/Redis, migrates, runs unit + e2e
pnpm --dir backend-nest test:e2e  # real backend flow; requires DATABASE_URL + REDIS_URL
pnpm test:watch           # vitest in watch mode
pnpm check                # all of the above; what you'd run before pushing
```

For real-browser end-to-end tests (hydration, routing, anything jsdom can't see), use Playwright from `frontend/`:

```bash
cd frontend
pnpm test:e2e             # headless against the running app (Traefik :3000)
pnpm test:e2e:headed      # watch it drive the browser
```

Chromium is provided by NixOS (`nixos/modules/playwright.nix`, dev only) since Playwright's own download won't run here. Full story, including how to point it at `pnpm dev`: [docs/07-building-apps.md](docs/07-building-apps.md#end-to-end-tests-playwright).

Lint/format config: [`.oxlintrc.json`](.oxlintrc.json) and [`.oxfmtrc.json`](.oxfmtrc.json).

## Apply system changes

Anything that's not a code edit (new package, new systemd unit, env-var schema change, service enable/disable) is a NixOS change. Edit a module under `nixos/modules/`, then:

```bash
sudo nixos-rebuild switch --flake /workspace/nixos#default --fast
```

NixOS evaluates the flake, builds the new system, swaps to it atomically. Failed evaluation never touches the running system. Failed activation rolls back to the previous generation.

For pure code edits, skip nixos-rebuild and just restart the affected unit (`sudo systemctl restart playcode-frontend`).

## Deploy

`deploy.sh` is what runs on every publish (`nixos-rebuild switch --flake .#prod` → install → migrate → build → restart). Edit it freely - the editor runs it verbatim. Deploy config (timeout, healthcheck) lives in [`playcode.yml`](playcode.yml).

## API style: REST

This template ships REST controllers (`@Controller('foo')` + `@Get`/`@Post`) with `class-validator` DTOs validated by a global `ValidationPipe` - the standard NestJS path that every tutorial and `@nestjs/swagger` assume. Lower friction than GraphQL for most apps. If you want GraphQL, swap in `@nestjs/graphql` + `@apollo/server`; the rest of the stack (Prisma, queue, logger) is identical. See [docs/07-building-apps.md](docs/07-building-apps.md#validation) for the validation pattern.
