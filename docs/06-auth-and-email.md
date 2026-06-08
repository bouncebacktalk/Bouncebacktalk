# 06 - Auth & email

How the default auth, queued email, React Email templates, and transports work in {{PROJECT_TITLE}}.

## TL;DR

- Auth, users, leads CRM, Prisma, Redis, and the email queue are enabled by default.
- `setup.sh` creates `.env.local` with `DATABASE_URL`, `REDIS_URL`, JWT secrets, `ADMIN_EMAILS`, and console mail defaults.
- `playcode-backend.service` runs `prisma migrate deploy` before every start.
- Frontend calls use `frontend/apps/api`, which always targets relative `/api/*`.
- API validation errors use a stable Zod issue shape that the frontend SDK parses into `ApiError.issues`.
- Password reset and lead-notification emails are queued in BullMQ, rendered by React Email with Tailwind, and sent through `EmailService`.
- Default transport is `console`; switch to Resend when you're ready.

## Endpoints

| Method | Path | Body | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | `{ email, password, name? }` | Create user; sets cookies; returns `{ user, accessToken? }` |
| POST | `/api/auth/login` | `{ email, password }` | Authenticate; sets cookies; returns `{ user, accessToken? }` |
| POST | `/api/auth/logout` | - | Clears cookies; revokes refresh token |
| POST | `/api/auth/refresh` | - (reads cookie) | Rotates tokens; returns `{ user, accessToken? }` |
| POST | `/api/auth/forgot-password` | `{ email }` | Sends reset email (always 204 - no enumeration) |
| POST | `/api/auth/reset-password` | `{ token, newPassword }` | Consumes reset token; sets new password |
| GET | `/api/users/me` | - (requires auth) | Current user's public profile |
| POST | `/api/leads` | `{ email, message, name?, company?, source? }` | Public contact form submission |
| GET | `/api/leads` | - (admin only) | List recent leads |
| PATCH | `/api/leads/:id` | `{ status }` (admin only) | Mark a lead `NEW`, `CONTACTED`, or `ARCHIVED` |
| DELETE | `/api/leads/:id` | - (admin only) | Delete a spam/test lead |

## Cookies

Auth is cookie-first. Access and refresh tokens are set as HTTP-only cookies:

| Cookie | TTL | Path | Purpose |
|---|---|---|---|
| `access_token` | `JWT_ACCESS_TTL` (default 15m) | `/` | JWT, validated by `JwtStrategy` on every guarded request |
| `refresh_token` | `JWT_REFRESH_TTL` (default 30d) | `/api/auth/refresh` | Random 384-bit string, hashed in DB |

Why cookies first:

- **SSR-friendly** - Vike's server reads cookies natively; no need to pass an access token through the SSR boundary
- **Lower XSS exposure** - `httpOnly` means JS can't read cookie tokens even if your site has an XSS bug somewhere
- **Browser sends them automatically** - `fetch('/api/users/me')` from anywhere in the SPA just works

PlayCode preview can embed your app in an iframe under a different top-level origin. Browsers may treat app cookies as third-party cookies there; `SameSite=Lax` will not be sent in that context, and even `SameSite=None; Secure` can be blocked by privacy settings. To keep preview usable, auth endpoints expose the short-lived access token when `AUTH_EXPOSE_ACCESS_TOKEN=true` (default). The frontend stores only that access token and sends `Authorization: Bearer <jwt>` as a fallback. The refresh token remains HTTP-only and cookie-only.

Why not default to `SameSite=None; Secure` only: it helps browsers that allow third-party cookies, but it does not bypass modern third-party cookie blocking. The bearer fallback is the reliable preview path; cookies remain the safer default for direct app usage.

Cookie policy knobs in `.env.local`:

| Env | Default | Purpose |
|---|---|---|
| `AUTH_EXPOSE_ACCESS_TOKEN` | `true` | Enables the preview bearer fallback. Set `false` for apps that never run embedded preview. |
| `AUTH_COOKIE_SAME_SITE` | `lax` | `lax`, `strict`, or `none`. Use `none` only when you need cross-site cookie sends. |
| `AUTH_COOKIE_SECURE` | auto | Forced `true` when `SameSite=None`, otherwise follows `NODE_ENV=production`. |

If you build a mobile app or third-party API client, use the same `Authorization: Bearer <jwt>` support - see [`strategies/jwt.strategy.ts`](../backend-nest/src/auth/strategies/jwt.strategy.ts).

## Frontend API client

Use the shipped API and auth apps:

```ts
import { authClient } from '../apps/auth'

const user = await authClient.me()
await authClient.login({ email, password })
await authClient.logout()
```

The important rule: **frontend code never reads the `refresh_token`**. It is HTTP-only on purpose. The browser sends cookies automatically when `fetch()` calls relative `/api/*`; if preview cookies are blocked, `frontend/apps/api` adds the short-lived bearer access token.

`frontend/apps/api` handles the boring parts:

- prefixes requests with `/api`
- sets `credentials: 'include'`
- sends/receives JSON
- exposes `apiGet`, `apiPost`, `apiPatch`, and `apiDelete`
- sends a bearer access token when one is available
- turns backend Zod validation responses into `ApiError.issues` and `ApiError.fieldErrors`
- exposes `ApiError.code` and `ApiError.requestId` for debugging
- on `401`, calls `POST /api/auth/refresh` once and retries the original request

Validation errors from backend controllers look like this:

```json
{
  "statusCode": 400,
  "error": "VALIDATION_ERROR",
  "message": "Validation failed",
  "requestId": "req_...",
  "issues": [
    {
      "path": "email",
      "message": "Enter a valid email address.",
      "code": "invalid_string"
    }
  ]
}
```

The SDK formats that into a useful `ApiError.message` and keeps the structured issues:

```ts
import { ApiError } from '../apps/api'

try {
  await authClient.register({ email, password })
} catch (err) {
  if (err instanceof ApiError) {
    console.log(err.message)
    console.log(err.fieldErrors.email)
  }
}
```

Do not use `localhost:3011` in browser code. In the VM, Traefik owns the public port and routes:

```
/api/*  -> NestJS backend
/*      -> Vike frontend
```

`frontend/apps/auth` builds on that client with:

- `authClient.me()`
- `authClient.login({ email, password })`
- `authClient.register({ email, password, name })`
- `authClient.logout()`

Pages `/login`, `/register`, and `/dashboard` are intentionally small examples. Replace the UI, keep the API client shape.

## Admin boundary and leads CRM

The starter includes a tiny admin foundation inside the app code:

```
public visitor
  └─ POST /api/leads
       ├─ stores Lead in Postgres
       └─ queues lead-notification email to ADMIN_EMAILS

signed-in admin
  └─ /dashboard
       └─ GET/PATCH/DELETE /api/leads/*
```

Admin access is not granted to every registered user. The first registered user gets `isAdmin=true` in the database, and `ADMIN_EMAILS` acts as an override for extra or recovery admins. CRM endpoints require both guards:

```ts
@UseGuards(JwtAuthGuard, AdminGuard)
@Get('leads')
listLeads() {}
```

`AdminGuard` accepts either `user.isAdmin` or an authenticated email in `ADMIN_EMAILS`:

```env
ADMIN_EMAILS=founder@example.com,ops@example.com
```

Use this as the default for small apps. If your product later needs teams, roles, invitations, or billing-seat permissions, replace the boolean admin flag with DB-backed role checks. Do not expose leads to all authenticated users.

Quick backend check before touching frontend:

```bash
mkdir -p temp
curl -i -c temp/auth-cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"password","name":"Test"}' \
  http://localhost:3000/api/auth/register

curl -i -b temp/auth-cookies.txt http://localhost:3000/api/users/me
```

Default password validation is intentionally light: 8 to 128 characters, no forced digits, symbols, or uppercase letters. That keeps the starter app easy to test while still blocking empty or tiny passwords. Tighten `backend-nest/src/auth/dto/auth-fields.schema.ts` when the product needs stricter policy.

## Refresh-token rotation + replay detection

Every `/api/auth/refresh` call:

1. Looks up the presented refresh token by SHA-256 hash
2. Rejects if expired or already revoked
3. Marks the old row revoked
4. Issues a fresh access + refresh pair

If a revoked refresh token is presented (replay), the entire user's refresh-token chain is revoked - every other device gets logged out. This is the standard defense against stolen refresh tokens: the moment the legitimate user refreshes after the attacker, the attacker's old token is dead, and we know something's off.

Refresh tokens are stored as SHA-256 hashes - even with a DB compromise, the raw tokens can't be replayed.

## Password reset

`POST /api/auth/forgot-password` always returns 204, regardless of whether the email is registered. This stops attackers from probing your DB for valid emails.

If the email *is* registered:

1. A 32-byte random token is generated and SHA-256-hashed in `password_resets` table
2. A BullMQ job is enqueued through `EmailQueue`.
3. `EmailProcessor` renders the React Email password-reset template and sends it through `EmailService`.
4. The user clicks the link, your frontend collects a new password, POSTs to `/api/auth/reset-password`
5. The token is consumed (single-use), the password is updated, all refresh tokens are revoked

Token expiry: 1 hour (hard-coded in `auth.service.ts`; tighten if needed).

## Protected routes

Add a guard:

```ts
import { CurrentUser, JwtAuthGuard } from '../auth'
import { UseGuards } from '@nestjs/common'
import type { User } from '@prisma/client'

@UseGuards(JwtAuthGuard)
@Get('private')
secret(@CurrentUser() user: User) {
  return { hi: user.email }
}
```

`JwtAuthGuard` validates the access token (cookie or `Authorization` header). On success, the User is attached to the request via `JwtStrategy.validate()` and `@CurrentUser()` reads it.

To make every endpoint in a controller require auth, put `@UseGuards(JwtAuthGuard)` at the class level instead of per-method.

## Tests

Auth has two test layers:

| Command | Scope | Requires |
|---|---|---|
| `pnpm --dir backend-nest test` | Fast unit tests under `src/**/*.test.ts` | No database, no Redis |
| `pnpm --dir backend-nest test:e2e` | Full backend auth flow under `test/*.e2e-spec.ts` | `DATABASE_URL`, `REDIS_URL`, migrations applied |
| `pnpm test:smoke` | Starts temp Postgres/Redis, applies migrations, runs unit + e2e | Local `postgres` and `redis-server` binaries |

The e2e test starts the real `AppModule` and verifies:

- register creates a persisted user and refresh token
- invalid auth input returns stable Zod field issues
- HTTP-only auth cookies are set with the expected paths
- `/api/users/me` works through cookies and bearer fallback
- login issues a new refresh token
- refresh rotates the presented token in Postgres
- logout revokes the presented refresh token
- duplicate registration returns `409`
- public lead submission stores a lead
- honeypot lead submission returns success without storing
- admin can list/update/delete leads
- non-admin cannot read leads

Run `pnpm test:smoke` from the repo root for the lowest-friction full flow. It uses `.env.test` and writes temporary data under `temp/`. For custom local services, override `DATABASE_URL` and `REDIS_URL` in `.env.test.local`.

## React Email Templates

Templates live in [`email/email-template.service.ts`](../backend-nest/src/email/email-template.service.ts). They use the supported unified `react-email` package:

```ts
import { Tailwind, pixelBasedPreset, render } from 'react-email'
```

Keep templates data-in/data-out: render HTML/text in `EmailTemplateService`, enqueue jobs in `EmailQueue`, send with `EmailService`. That separation keeps business logic out of transport code and makes templates easy to preview or test.

## Email transport

Two backends, picked at boot from `MAIL_TRANSPORT`:

### Console (default, dev)

```env
MAIL_TRANSPORT=console
MAIL_FROM={{PROJECT_TITLE}} <noreply@example.com>
```

Every `EmailService.send(...)` call writes the formatted message to stdout via the structured logger. View with `journalctl -u playcode-backend -f`. Zero setup, zero account creation, perfect for development and tests.

### Resend (prod)

[Resend](https://resend.com) - free tier 3k emails/month, 100/day, paid tiers cheap. Setup:

1. Sign up at resend.com
2. Add and verify your sending domain (DNS records they generate)
3. Generate an API key
4. Add to `.env.local` at the repo root:
   ```bash
   MAIL_TRANSPORT=resend
   MAIL_FROM="{{PROJECT_TITLE}} <hello@your-domain.com>"
   RESEND_API_KEY=re_...
   ```
5. `sudo systemctl restart playcode-backend`

The `resend` backend constructor crashes at boot if `RESEND_API_KEY` is missing - better to fail loudly than to silently drop password-reset emails.

### Adding a new backend

`EmailBackend` is a one-method interface in [`email/interfaces.ts`](../backend-nest/src/email/interfaces.ts). To add SES, Postmark, Mailgun, etc.:

1. Add a class in `email/backends/<name>.backend.ts` implementing `EmailBackend`
2. Add the case to `EmailService.onModuleInit()`'s switch
3. Add the env var to `ConfigService.EnvSchema`

That's the whole change. We deliberately didn't ship more backends because each adds an SDK dep - a starter that pulls 50 MB of provider clients you'll never use is worse than one that ships clean.

## What we deliberately didn't include

- **OAuth (Google / GitHub / Apple)** - every provider has its own quirks, callback URLs, and account-linking decisions. Add when you have a real signup-friction need; skip for v1.
- **Magic links / passwordless** - same reasoning. Email + password is what every NestJS tutorial assumes and what most apps actually ship.
- **2FA / TOTP** - adds a `user_totp_secrets` table and a verify endpoint. Easy to bolt on; not worth the surface area for a starter.
- **Drip campaigns / scheduled emails** - the queue foundation is present; add scheduling and campaign models when your product needs them.
- **Email-tracking / open + click pixels** - privacy-hostile by default; add deliberately if your business needs it.
- **DB-stored sent-email log** - Resend keeps its own log with a queryable UI; no point duplicating.

## File map

```
backend-nest/src/
├── auth/
│   ├── dto/                      Zod schemas for register/login/forgot/reset
│   ├── decorators/
│   │   └── current-user.decorator.ts   @CurrentUser()
│   ├── guards/
│   │   ├── admin.guard.ts               @UseGuards(AdminGuard)
│   │   └── jwt-auth.guard.ts            @UseGuards(JwtAuthGuard)
│   ├── strategies/
│   │   └── jwt.strategy.ts              passport-jwt validation
│   ├── auth.service.ts                  register/login/refresh/reset/revoke
│   ├── auth.controller.ts               REST endpoints
│   ├── auth.module.ts
│   └── index.ts
├── email/
│   ├── backends/
│   │   ├── console.backend.ts
│   │   └── resend.backend.ts
│   ├── interfaces.ts                    EmailMessage, SendResult, EmailBackend
│   ├── email-template.service.ts        React Email + Tailwind template rendering
│   ├── email.service.ts                 picks transport at boot, exposes send()
│   ├── email.module.ts
│   └── index.ts
├── queue/
│   ├── email.queue.ts                   producer for auth, leads, raw email, healthcheck jobs
│   ├── email.processor.ts               BullMQ worker that renders + sends
│   ├── email-job.types.ts
│   ├── queue.constants.ts
│   └── queue.module.ts
├── leads/
│   ├── dto/                             Zod schemas for contact submit and CRM updates
│   ├── leads.controller.ts              public submit + admin CRM REST endpoints
│   ├── leads.service.ts                 stores leads and queues notifications
│   ├── leads.module.ts
│   └── index.ts
├── users/
│   ├── user.service.ts                  findById/findByEmail/create/verifyPassword
│   ├── users.controller.ts              GET /api/users/me
│   ├── users.module.ts
│   └── index.ts
└── common/
    └── zod-validation.pipe.ts           reusable pipe for Zod-validated bodies
```

The auth ↔ users cycle is the canonical NestJS forwardRef demonstration - see [`05-nestjs-conventions.md`](05-nestjs-conventions.md) for why both ends use `forwardRef` and the dual type/value imports.
