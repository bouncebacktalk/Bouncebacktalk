# 02 - Architecture

The default full-stack shape and how a request flows through.

## Default Shape

Six processes managed by systemd:

```
                                              ┌──────────────────────┐
   user ── HTTPS ──► edge proxy ── HTTP ─────►│ Traefik :3000        │
                                              └──────────┬───────────┘
                                                         │
                            ┌────────────────────────────┼────────────────────────────┐
                            │                            │                            │
                            ▼                            ▼                            ▼
                     ┌──────────────┐             ┌──────────────┐             ┌──────────────┐
                     │ NestJS :3011 │             │ Caddy :3012  │             │ Vike  :3010  │
                     │ /api/* auth  │             │  /assets/*   │             │ everything   │
                     │ Prisma/queue │             │  static only │             │ else (SSR)   │
                     └──────────────┘             └──────────────┘             └──────────────┘
                            │
                 ┌──────────┴──────────┐
                 ▼                     ▼
           ┌──────────┐          ┌──────────┐
           │ Postgres │          │  Redis   │
           │  :5432   │          │  :6379   │
           └──────────┘          └──────────┘
                                      │
                                      └── BullMQ email queue
```

1. User hits `https://<your-public-url>/foo`
2. The edge proxy terminates TLS and forwards plain HTTP to the VM on `:3000`
3. Traefik picks the matching router by path priority:
   - `/api/*` → backend (NestJS)
   - `/assets/*` → Caddy (built JS/CSS)
   - `/*` → Vike (SSR)

Frontend code talks to the backend with relative `/api/*` URLs. `frontend/apps/api` is the default client: it keeps browser code off localhost, includes cookies, sends a bearer access-token fallback for embedded preview, and refreshes once after an expired access token.

The backend exposes health, auth, users, leads, Prisma, and queue endpoints by default:

| Path | Purpose |
|---|---|
| `GET /api/health` | Backend liveness |
| `GET /api/health/ready` | Deploy readiness: Postgres + BullMQ/Redis |
| `GET /api/health/db` | Prisma/Postgres check |
| `GET /api/health/queue` | BullMQ enqueue check |
| `POST /api/auth/*` | Register, login, logout, refresh, password reset |
| `GET /api/users/me` | Authenticated current user |
| `POST /api/leads` | Public contact-form submission |
| `GET/PATCH/DELETE /api/leads/*` | Admin-gated leads CRM |

The React starter includes minimal pages for this contract:

| Page | Purpose |
|---|---|
| `/` | Auth-aware entry page |
| `/login` | Login form |
| `/register` | Registration form |
| `/dashboard` | Authenticated dashboard plus admin-gated leads CRM |

Fresh projects serve `frontend/` (`spaMode = false`). Browser-imported projects can include `frontend-spa/`; in that path `setup.sh` receives `SPA_MODE=true` and Traefik routes `/` to the Vite SPA service. If `SPA_MODE=true` is ever passed without a `frontend-spa/` directory, setup falls back to the SSR frontend and logs a warning.

## Backend Modules

These modules are imported by default:

| Module | What it gives you | Source |
|---|---|---|
| `ConfigModule` | `ConfigService.env` - Zod-validated typed env. Fail-fast at boot. | `src/config/` |
| `LoggerModule` | `Logger` - transient-scope winston logger that auto-tags every line with the injecting class's name. Filter via `LOGGER_NAMESPACES`. | `src/logger/` |
| `PrismaModule` | Typed Prisma client over Postgres. | `src/prisma/` |
| `UsersModule` | User lookup, password hashing, public user DTOs. | `src/users/` |
| `AuthModule` | Cookie JWT auth, refresh rotation, password reset. | `src/auth/` |
| `LeadsModule` | Public contact form endpoint and admin-gated CRM endpoints. | `src/leads/` |
| `EmailModule` | Console/Resend transport plus React Email template rendering. | `src/email/` |
| `QueueModule` | BullMQ `email` queue backed by Redis. | `src/queue/` |

## Why REST, not GraphQL

This template ships REST controllers. Reasoning:

- Most NestJS tutorials and AI-generated code default to controllers + decorators. Lower friction.
- GraphQL adds: SDL files, resolvers, codegen, decisions about subscriptions / dataloaders / N+1. Real complexity for a starter that doesn't need it.
- `@Controller('foo')` with `@Get`/`@Post` is what people expect. Everything else (Prisma, queue, logger) works identically regardless of API style.

If you want GraphQL later, swap in `@nestjs/graphql` + `@apollo/server` per the [NestJS docs](https://docs.nestjs.com/graphql/quick-start). The rest of the stack doesn't change.

## Why six processes (when fully enabled)

- **Traefik vs. Caddy as edge.** PlayCode's convention is Traefik for routing, Caddy for static files - and we follow that. Same config language across our infrastructure means knowledge transfers between projects.
- **Caddy serving `/assets/*` instead of Vike.** Vike's Express server *can* serve static files via `express.static`. But `sendfile()` + precompressed brotli/zstd through Caddy is meaningfully faster, and frees the Node process to focus on SSR. The cache contract is deliberate: Vite-fingerprinted `/assets/*` files are immutable for one year, while SSR HTML and root-level public files are no-store.
- **NestJS as a separate process from Vike.** They could run in the same Node process (Vike's custom-server pattern), but separating them means independent restarts, isolated memory pressure, and clean systemd unit boundaries.
- **Postgres + Redis as separate processes.** Both are battle-tested daemons that should stand alone. The backend connects to them on loopback.

## Ports

| Port | Process | Bound to | Public? |
|---|---|---|---|
| 3000 | Traefik | `0.0.0.0` | Yes (the edge proxy fronts it) |
| 3010 | Vike (frontend) | `127.0.0.1` | No |
| 3011 | NestJS (backend) | `127.0.0.1` | No |
| 3012 | Caddy (static) | `127.0.0.1` | No |
| 5432 | Postgres | `127.0.0.1` | No |
| 6379 | Redis | `127.0.0.1` | No |

If you need to add a seventh service (worker, websocket gateway, etc.), claim the next port (3013+) and add a Traefik router rule in `nixos/modules/traefik.nix`.

## TLS

The VM never sees HTTPS. The edge proxy outside the VM terminates TLS using a wildcard cert and forwards plain HTTP to Traefik on `:3000`. This is why Traefik has `auto_https off` and no ACME config - adding another layer would be redundant.

## Process lifecycle

All processes are managed by systemd:

- `Restart=always` for the app processes (frontend, backend) - crash-loop on failure
- `Restart=on-failure` for Traefik / Caddy - they're stable, restarting on success is wasteful
- `User=app` (or `caddy`/`traefik`/`postgres`/`redis` for those roles) - never run as root
- Logs go to `journald` and you read them with `journalctl -u <unit>`
- `EnvironmentFile=/etc/playcode-app/<unit>.env` injects non-secret defaults from NixOS.
- `EnvironmentFile=-/workspace/.env.local` injects generated app secrets: `DATABASE_URL`, `REDIS_URL`, JWT secrets, and mail settings.
- The backend's systemd unit runs `prisma migrate deploy` as `ExecStartPre` - fresh migrations apply before the app starts serving requests.

## Tooling

- **Lint + format**: [oxlint + oxfmt](https://oxc.rs/) - single Rust binary, fast, one config (`.oxlintrc.json`, `.oxfmtrc.json`) shared across the whole repo.
- **Tests**: Vitest in both packages. Frontend uses jsdom + `@testing-library/react`; backend runs in Node and tests controllers/services directly.
- **No ESLint, no Prettier**: deliberately. OXC covers both jobs and is significantly faster, and a starter shouldn't drag in plugin ecosystems the user has to keep current.

See [03-deploy.md](03-deploy.md) for how new builds get picked up without dropping requests.
