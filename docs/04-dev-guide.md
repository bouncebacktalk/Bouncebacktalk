# 04 - Dev guide

Working on {{PROJECT_TITLE}} inside the VM. Quick reference for the common loops.

## Default Services

This template ships full-stack by default: Traefik, Vike, NestJS, Caddy, Postgres, Redis, Prisma, auth/users, the `email` BullMQ queue, and React Email templates all run from first boot.

## Lint, format, test

```bash
pnpm lint                 # oxlint
pnpm format               # oxfmt - rewrites in place
pnpm format:check         # oxfmt - non-mutating, exits non-zero if anything would change
pnpm typecheck            # tsc --noEmit on every package
pnpm test                 # vitest run, both packages
pnpm test:smoke           # temp Postgres/Redis, migrations, frontend tests, backend e2e
pnpm --dir backend-nest test:e2e  # real backend flow; requires DATABASE_URL + REDIS_URL
pnpm test:watch           # vitest in watch mode
pnpm check                # all of the above; what you'd run before pushing
```

Per-package commands (`pnpm --filter frontend test`, etc.) work too.

Prisma commands run from `backend-nest/` and load `.env.local` from the workspace root:

```bash
cd backend-nest
pnpm prisma:migrate        # creates a dev migration; requires dev mode CREATEDB
pnpm prisma:migrate:deploy # applies existing migrations
pnpm prisma:studio
```

In `playcode.services.mode = "dev"`, the NixOS Postgres module grants the app role `CREATEDB` so Prisma can create its shadow database. In `prod` mode it uses `NOCREATEDB`; production deploys should use `prisma:migrate:deploy`.

Database creation itself is handled by `playcode-postgresql-configure-app.service`, not by Prisma. That service runs as the local `postgres` superuser, creates the `app` role and project database idempotently, applies the `.env.local` password, and then applies the correct dev/prod role privilege. `deploy.sh` restarts it before migrations so a production VM forked from a dev snapshot is reconciled before the backend starts.

## "I changed X, now what?"

| Changed | Run |
|---|---|
| Frontend TSX/CSS | `sudo systemctl restart playcode-frontend` |
| Backend controller/service | `sudo systemctl restart playcode-backend` |
| `prisma/schema.prisma` | `cd backend-nest && pnpm prisma:migrate`, then restart backend |
| `package.json` deps | `pnpm install`, restart whichever service changed |
| `nixos/modules/*.nix` (any system config - packages, units, ports, traefik routing, caddy, postgres tuning) | `sudo nixos-rebuild switch --flake /workspace/nixos#default --fast` |
| `playcode.*` flag flip in `nixos/project.nix` (service enable/disable, ports) | Same as above |

## Logs

Every service writes to journald. The two you'll read most:

```bash
sudo journalctl -u playcode-frontend -f
sudo journalctl -u playcode-backend -n 200 --no-pager
sudo journalctl -u playcode-frontend --since '5 min ago' | grep -i error
```

Cross-service grep:

```bash
sudo journalctl -u 'playcode-*' --since '5 min ago'
```

Postgres / Redis logs come from their own units (`postgresql`, `redis`).

Fresh full-stack projects serve `frontend/` through `playcode-frontend`. Browser-imported projects add `frontend-spa/` and set `spaMode = true` so the imported Vite app is served instead. If `SPA_MODE=true` is passed but `frontend-spa/` is missing, setup falls back to SSR and prints a warning.

## Health checks

```bash
curl http://localhost:3000/api/health         # backend liveness
curl http://localhost:3000/api/health/ready   # deploy readiness: DB + queue
curl http://localhost:3000/api/health/db      # Prisma → Postgres   (needs PrismaModule)
curl http://localhost:3000/api/health/queue   # enqueue a BullMQ health job
```

If the public URL fails but `localhost:3000/api/health` works directly, the routing layer outside the VM is the problem, not the backend.

## Common gotchas

- **Frontend changes not showing up** - production mode long-caches only Vite-fingerprinted `/assets/*` files. HTML, `/avatar.png`, `/favicon.svg`, `/robots.txt`, and other root-level public files are served with no-store headers, so restart the right frontend service and hard-refresh if the browser still shows an old document.
- **Public asset stuck behind a CDN** - import production-cacheable images, fonts, and CSS assets from source so Vite emits `/assets/name.<hash>.*`. Use `public/` only for stable filenames such as `robots.txt`, favicons, and files that deliberately keep the same URL.
- **`/api/foo` returns 404** - NestJS prefixes everything with `/api` (in `main.ts`). Make sure your controller path doesn't include `/api` again, or you'll end up at `/api/api/foo`.
- **Prisma errors after pulling new code** - someone added a model. Run `pnpm prisma:generate` to regenerate the client, then `pnpm prisma:migrate` to apply migrations.
- **`DATABASE_URL`/`REDIS_URL` not set** - those are generated into `.env.local` by setup and loaded by `playcode-backend.service`. If they're missing, check `journalctl -u playcode-backend` for the Zod validation error from `ConfigService`, restore `.env.local`, then restart the backend.
- **Static assets 404** - Caddy serves `frontend/dist/client/` or browser-imported `frontend-spa/dist/` from your workspace. Did the build complete? `ls frontend/dist/client/ frontend-spa/dist/` to verify.

## Database

```bash
sudo -u postgres psql                           # superuser
sudo -u postgres psql -d {{PROJECT_NAME}}       # your db
\dt                                             # list tables
\d leads                                       # contact-form submissions

# From your laptop (via SSH tunnel):
ssh -L 5432:127.0.0.1:5432 <your-vm-host>
# then connect with any local Postgres GUI to localhost:5432
```

Prisma Studio (web UI for browsing data):

```bash
cd backend-nest
pnpm prisma:studio    # opens on :5555
```

## Background jobs

The starter includes a working `email` queue:

- `src/queue/email.queue.ts` enqueues jobs.
- `src/queue/email.processor.ts` processes jobs.
- `src/email/email-template.service.ts` renders React Email templates with Tailwind classes.
- `src/email/email.service.ts` sends through console or Resend.
- Contact form notifications use the same queue and React Email renderer.

Add another queue:

1. Register it in `QueueModule.imports`:
   ```ts
   BullModule.registerQueue({ name: 'reports' })
   ```
2. Create a producer (`src/queue/reports.producer.ts`) that injects `@InjectQueue('reports')` and adds jobs.
3. Create a processor (`src/queue/reports.processor.ts`) decorated with `@Processor('reports')` extending `WorkerHost`.
4. Add both to `QueueModule.providers`.

Copy the `EmailQueue` / `EmailProcessor` shape and replace the job types with your domain work.

## Adding a new feature module

Read [`05-nestjs-conventions.md`](05-nestjs-conventions.md) first - the `forwardRef` + dual-import discipline is non-negotiable, and `users/` + `leads/` in `backend-nest/src/` are full working examples to copy.

The short version:

1. Create `backend-nest/src/<feature>/` with `<feature>.service.ts`, `<feature>.controller.ts`, `<feature>.module.ts`, `index.ts`.
2. In the service, use `import type { OtherService as OtherServiceType }` + value `import { OtherService }` for any cross-module dep, and `@Inject(forwardRef(() => OtherService))` on the constructor parameter.
3. In the module, wrap cross-feature imports in `forwardRef(() => OtherModule)` and put your service in `exports`.
4. Import the module into `app.module.ts`.
5. Restart `playcode-backend`.

Skip the convention and you'll hit `Nest can't resolve dependencies of FooService` the moment two features reference each other.

## Adding a new route

- **API endpoint** - controller in `backend-nest/src/<feature>/`, restart `playcode-backend`. Available at `/api/<path>`.
- **New page** - `frontend/pages/<route>/+Page.tsx`, restart `playcode-frontend`. Vike auto-routes by directory.
- **New service entirely** (worker, websocket, etc.) - claim a new internal port (3004+), add a systemd unit in `nixos/modules/app.nix`, and add a Traefik router rule in `nixos/modules/traefik.nix`. Run `sudo nixos-rebuild switch` to apply.
