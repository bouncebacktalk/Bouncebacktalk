# 07 - Building Apps

Copy, extend, or delete the starter modules without changing the platform.

## App Modules

| Module | Keep when | Delete when |
|---|---|---|
| `frontend/apps/api` | Always. Browser code needs relative `/api/*`, auth refresh, and `ApiError`. | Almost never. |
| `frontend/apps/ui` | You want the app-level compositions on shadcn: form fields, notices, stat cards, page headers, empty states. | You build every screen from raw `@/components/ui` primitives. |
| `frontend/apps/auth` | The app has accounts, an admin console, or a profile page. | Pure public site with no login. |
| `frontend/apps/dashboard` | The app needs an admin shell - sidebar + mobile drawer + top bar - plus the auth/role gates that wrap pages. | Pure public site with no signed-in area. |
| `frontend/apps/users` | You want admin member management (list, promote/demote, remove). | No multi-user administration. |
| `frontend/apps/contact` | The landing page needs a contact form. | No public intake. |
| `frontend/apps/leads` | You want an admin CRM for submissions (list, bulk actions, detail page). | You send form data only to a third-party CRM. |
| `backend-nest/src/leads` | You want DB-backed leads and email notifications. | You remove `frontend/apps/contact` and `frontend/apps/leads`. |

## API Calls

Use the handwritten SDK:

```ts
import { apiGet, apiPost } from '../apps/api'

const leads = await apiGet<Lead[]>('/leads')
await apiPost('/leads', { email, message })
```

Rules:

- call relative `/api/*`, never browser `localhost`
- catch `ApiError` for `status`, `code`, `requestId`, `issues`, and `fieldErrors`
- keep refresh-token handling inside `apps/api`

## Validation

Standard NestJS: DTO classes with `class-validator` decorators, validated by a
global `ValidationPipe` (configured in `src/app.setup.ts`). Type a handler
param with the DTO and it is validated + transformed automatically:

```ts
@Post()
create(@Body() body: CreateLeadDto) { ... }   // no per-route pipe
```

- DTOs live next to their feature: `leads/dto/lead.dto.ts`, `users/dto/users.dto.ts`, `auth/dto/*.dto.ts`
- shared field decorators (`@EmailField()`, `@PasswordField()`) compose validators with `applyDecorators` (`auth/dto/auth-fields.ts`)
- the pipe's `exceptionFactory` emits the standard error envelope (`{ error: "VALIDATION_ERROR", issues, ... }`), so the frontend's `ApiError` parsing works unchanged
- `whitelist: true` strips unknown keys; `transform: true` coerces `@Type(() => Number)` params/queries
- env vars are still validated with Zod at boot (`config/config.service.ts`) - that is config, not request input

## Contact To CRM Flow

```
/ page
  └─ ContactForm
       └─ POST /api/leads
            ├─ DTO validation (class-validator)
            ├─ honeypot spam no-op
            ├─ Lead row in Postgres
            └─ email queue notification to ADMIN_EMAILS

/leads   (admin only)
  └─ LeadsView
       └─ JwtAuthGuard + AdminGuard
            ├─ list / search / filter, multi-select
            ├─ bulk status + bulk delete
            └─ /leads/:id detail page
```

The first registered user becomes admin automatically. Add extra or recovery admins in `.env.local`:

```env
ADMIN_EMAILS=founder@example.com,ops@example.com
```

Do not show leads to every authenticated user. If you add customer accounts, keep CRM endpoints admin-only.

## Pages & access

Two surfaces, gated by role:

- **Admin console** (sidebar shell): `/dashboard`, `/leads` + `/leads/:id`, `/members`, `/settings`. Every page is wrapped in `DashboardPage`, which is **admin-only** - it sends guests to `/login` and non-admins to `/profile`.
- **Member profile**: `/profile`, a standalone `ProfilePage` (no admin sidebar) for signed-in non-admins. After login, `AuthForm` redirects by role: admins to `/dashboard`, members to `/profile`.

To add an admin page: create `pages/<name>/+Page.tsx`, wrap the view in `DashboardPage`, and add a `NAV` entry in `apps/dashboard/AppSidebar.tsx`.

Read a route param with `usePageContext()` (wired in `renderer/`):

```tsx
import { usePageContext } from '../../../renderer/usePageContext'
const { routeParams } = usePageContext()   // pages/leads/@id/+Page.tsx -> routeParams.id
```

## UI Defaults

The starter is **shadcn-based** (new-york / neutral):

- the full shadcn kit lives in `frontend/components/ui` - import primitives straight from `@/components/ui/<name>` (Button, Card, Table, Dialog, Sheet, DropdownMenu, AlertDialog, Select, Sonner, Sidebar, ...)
- `cn()` (clsx + tailwind-merge) lives in `frontend/lib/utils`; the `@/*` alias is configured for Vite, Vitest, and TypeScript
- Tailwind v4 tokens and the `.dark` theme live in `frontend/renderer/styles.css`; `dark:` variants resolve against the `.dark` class via `@custom-variant dark`
- `frontend/apps/ui` holds the app-level compositions on top of those primitives: `TextField`, `TextArea`, `FieldError`, `Notice`, `StatCard`, `PageHeader`, `EmptyState`, `Spinner`, and `SilkRibbons` (the animated WebGL hero backdrop - three.js, lazy-loaded, degrades to a plain background if WebGL is unavailable)
- the admin shell lives in `frontend/apps/dashboard`: `DashboardLayout` uses shadcn `Sidebar` (collapsible on desktop, off-canvas drawer on mobile via the top-bar trigger)

Add more shadcn components on demand (they drop into `components/ui` and reuse the same tokens):

```bash
cd frontend
pnpm dlx shadcn@latest add chart carousel   # etc.
```

## Tests

Use the fast loop first:

```bash
pnpm --dir frontend test
pnpm --dir backend-nest test
```

Use the full flow before shipping template changes:

```bash
pnpm test:smoke
```

`pnpm test:smoke` starts temporary Postgres and Redis under `temp/`, applies migrations, runs frontend tests, backend unit tests, and backend e2e tests.

Override local test services in `.env.test.local`:

```env
DATABASE_URL=postgresql://postgres@127.0.0.1:55432/playcode_test
REDIS_URL=redis://127.0.0.1:56379
```

## End-to-end tests (Playwright)

Vitest checks components in jsdom. **Playwright** drives a real browser against
the running app - reach for it when a bug only appears once HTML, CSS, and JS
run together: hydration, client-side routing, focus traps, a button wired to
nothing. It is the agent's debugging tool as much as a test suite.

```bash
cd frontend
pnpm test:e2e            # headless, against the live app
pnpm test:e2e:headed     # watch the browser drive itself
pnpm test:e2e:ui         # Playwright's time-travel inspector
```

Tests live in `frontend/e2e/*.spec.ts`; config is `frontend/playwright.config.ts`.
`frontend/e2e/landing.spec.ts` is a worked example (it also shows how to assert
that navigation is real Vike client routing, not a full reload).

**Which URL it hits.** Default `baseURL` is `http://localhost:3000` - Traefik,
the user-facing port, so `/api/*` works too. Point it elsewhere with
`E2E_BASE_URL` (e.g. `http://localhost:3010` for a bare `pnpm dev`). The test
does not start a server; have the app already running (it is, via systemd).

**Browser on NixOS - two sources, only one is right here.** Playwright normally
downloads its own browser builds (`playwright install`); those assume an FHS
layout and will **not** launch on NixOS. So on the VM you do **not** run
`playwright install` - the browser comes entirely from Nix. `nixos/modules/playwright.nix`
(dev VMs only) provides `playwright-driver.browsers-chromium` - chromium **only**
(~300 MB), not the full `browsers` bundle that also pulls firefox + webkit (~1 GB)
- and exposes it as `PLAYWRIGHT_BROWSERS_PATH`. The config finds that binary at
runtime and launches it via `launchOptions.executablePath`.

Off NixOS (your laptop or CI) that path is absent, so there Playwright uses its
own browser after one `pnpm exec playwright install chromium`. That command is
for non-NixOS environments; never run it on the VM.

`@playwright/test` is pinned to the version Nixpkgs ships (`playwright-driver`),
**not** the npm latest - on the VM the browser is the Nix one, so the client
should match the browser it drives. `pnpm install` may note "a newer version is
available"; that is expected, leave it. When you bump Nixpkgs, re-align with:

```bash
nix eval --raw nixpkgs#playwright-driver.version   # the version to pin
```
