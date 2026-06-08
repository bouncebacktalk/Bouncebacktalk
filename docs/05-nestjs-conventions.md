# 05 - NestJS conventions

The conventions below are non-negotiable for bouncebacktalk_app. They look slightly verbose but they're the difference between a backend that grows cleanly and a backend that crashes at boot with `Nest can't resolve dependencies of the FooService` because two modules ended up referencing each other.

The pattern is lifted directly from PlayCode's own backend-nest, where it has saved us from circular-dependency debugging on every feature we've shipped.

## Rule 1 - Cross-module service injection always uses `forwardRef`

When `ServiceA` (from `users/`) injects `ServiceB` (from `posts/`), use this exact shape:

```ts
// users/user.service.ts
import { Inject, Injectable, forwardRef } from '@nestjs/common'

// Dual import: a `type`-only import for the annotation, and a value
// import for the runtime forwardRef factory. The type import gets
// erased by the TS compiler so it never hits the runtime module
// graph; the value import is wrapped in a lazy factory so its
// resolution happens after both modules finish constructing.
import type { PostService as PostServiceType } from '../posts/post.service'
import { PostService } from '../posts/post.service'

@Injectable()
export class UserService {
  constructor(
    @Inject(forwardRef(() => PostService))
    private readonly postService: PostServiceType,
  ) {}
}
```

**Even if there's no cycle today, write it this way.** A teammate (or AI agent) will eventually add a feature in `posts/` that depends on something in `users/` and the cycle will appear. With this pattern in place, nothing breaks. Without it, you'll spend 30 minutes refactoring imports to find the cycle.

The cost of always doing this: ~5 extra lines per cross-module dep. The savings: every circular-dep bug you'll never hit.

## Rule 2 - Module imports across feature boundaries use `forwardRef` too

Every module that imports another feature module uses `forwardRef` in the imports array:

```ts
// users/users.module.ts
import { Module, forwardRef } from '@nestjs/common'
import { PostsModule } from '../posts/posts.module'
import { AuthModule } from '../auth/auth.module'
import { UserService } from './user.service'
import { UsersController } from './users.controller'

@Module({
  imports: [
    forwardRef(() => PostsModule),
    forwardRef(() => AuthModule),
  ],
  providers: [UserService],
  controllers: [UsersController],
  exports: [UserService],
})
export class UsersModule {}
```

Imports of **infrastructure modules** (the ones in this template's `src/{config,logger,prisma,cache,queue}/`) don't need forwardRef - those are global, side-effect-free, and never imported by user features in a way that would cycle.

## Rule 3 - Always export the service from its module

The module that owns a service has to put it in `exports` for other modules to inject it:

```ts
@Module({
  providers: [UserService],
  exports: [UserService],   // ← without this, other modules can't `@Inject(UserService)`
})
export class UsersModule {}
```

Forgetting `exports` produces an error at boot: `Nest can't resolve dependencies of FooService (...). Please make sure that the argument UserService at index [0] is available in the FooModule context.`

## Rule 4 - Prisma sidesteps the entity-side problem entirely

In Sequelize/TypeORM you'd see this pattern on entities, where every cross-entity reference is a lazy callback:

```ts
// Sequelize - DON'T copy this into our template
@HasMany(() => Post, { foreignKey: 'userId' })
posts?: PostType[]
```

This template uses **Prisma**, which sidesteps the issue:

- The whole schema lives in one file ([`backend-nest/prisma/schema.prisma`](../backend-nest/prisma/schema.prisma)).
- Relations are declarative, not classes:
  ```prisma
  model User {
    id    Int    @id @default(autoincrement())
    posts Post[]
  }
  model Post {
    id     Int  @id @default(autoincrement())
    user   User @relation(fields: [userId], references: [id])
    userId Int
  }
  ```
- The generated `PrismaClient` is the only thing your code imports - you never import one entity class from another.

So one fewer rule to remember. **You only need to apply Rules 1-3 for service- and module-level injections.**

## Worked example

The [`users/`](../backend-nest/src/users/) feature module in this template demonstrates Rules 1-3 end-to-end. Read it once before you write your second feature module and you'll never have a circular-dep bug.

## What the template's existing modules look like

The infrastructure modules (`config`, `logger`, `prisma`, `cache`, `queue`) deliberately don't use `forwardRef` between each other:

- They have no cross-module dependencies among themselves
- They're imported into `AppModule` in a fixed order
- Adding `forwardRef` to globally-scoped, dependency-free modules is noise

So **don't** retrofit `forwardRef` onto `LoggerModule` or `ConfigModule` for "consistency" - Rules 1-3 are about *cross-feature* boundaries.

## Quick reference

| Situation | Use forwardRef? |
|---|---|
| Service A in `users/` injects Service B in `posts/` | **Yes** |
| Module A imports Module B (both feature modules) | **Yes** |
| Service injects `LoggerModule` / `ConfigModule` / `PrismaService` | No (global, no cycle possible) |
| Service injects another service in **the same module** | No |
| Prisma model `User` references model `Post` | No (Prisma handles it; just declare in `schema.prisma`) |

## Rule 5 - Don't re-export modules from feature barrels (Vite ESM trap)

`forwardRef` solves the NestJS DI graph cycle. It does **not** solve a second cycle that hides one level below: the **JavaScript module-load graph**. Under tsc / ts-node this cycle is invisible because evaluation is eager and single-threaded. Under Vite (Vitest, Vite-NestJS, any ESM-native bundler) it surfaces as:

```
A circular dependency has been detected inside AuthModule.
Please, make sure that each side of a bidirectional relationships are decorated with "forwardRef()".
```

…even though every `imports:` entry already uses `forwardRef`. The error message lies about the cause.

**The anti-pattern.** A feature directory has an `index.ts` barrel that re-exports the module class along with the service:

```ts
// features/analytics/index.ts - DANGEROUS
export * from './analytics.module'
export * from './analytics.service'
```

Other files reach for the barrel:

```ts
// users/user.service.ts
import { AnalyticsService } from '@/analytics'   // ← pulls in the WHOLE barrel
```

What goes wrong, step by step (test runner imports `UserService` directly):

1. `user.service.ts` starts loading
2. `@/analytics` barrel begins evaluating → triggers `analytics.module.ts`
3. `analytics.module.ts` imports `ProjectModule` (value import, not `forwardRef`'d at the file level)
4. `project.module.ts` imports `AuthModule` (value import)
5. `auth.module.ts` begins evaluating - and its `import { AuthService } from './auth.service'` finds `auth.service.ts` is **still in flight** from a sibling chain
6. `AuthService` is `undefined` at this moment (ESM live binding, not yet bound)
7. `@Module({ providers: [AuthService, ...] })` decorator captures the array literal **now** - so `providers[0] = undefined`
8. Later, NestJS scans the module, sees `undefined` in `providers`, and throws the misleading "circular dependency" error

`forwardRef` can't help here because the cycle is at the file-import level, not the DI level. The undefined value is captured in metadata before NestJS ever runs.

**The fix.** Don't expose modules from feature barrels. Either:

- Drop the `export * from './X.module'` line - barrels are for services/DTOs/interfaces only, and consumers import the module by its concrete path: `import { AnalyticsModule } from '@/analytics/analytics.module'`.
- Or remove the barrel entirely and always import by concrete file path: `from '@/analytics/analytics.service'`.

**The narrower rule** (when removing the barrel re-export is impossible): every **service / controller / resolver / guard** must import sibling services by their concrete file path, never via a barrel that itself re-exports a `.module`:

```ts
// ✓ Safe - concrete path, no module evaluated as a side effect
import { AnalyticsService } from '@/analytics/analytics.service'

// ✗ Dangerous - pulls in analytics.module, which pulls in ProjectModule, etc.
import { AnalyticsService } from '@/analytics'
```

Module files (`*.module.ts`) importing other modules through the barrel is fine: at the module-level, the value class is what you actually need, and any DI cycles are resolved by `forwardRef` in the `imports:` array.

## Debugging a circular dep (Vite / Vitest)

The error message points at the WRONG module 80% of the time. Here's the recipe that actually finds the cause:

**Step 1 - Confirm it's the Vite ESM trap, not a NestJS DI graph cycle.** If the same module boots fine under `nest start` (or `pnpm dev`) but fails under `vitest run`, it's the file-graph cycle. NestJS DI cycles fail in production too.

**Step 2 - Find the *actual* undefined provider.** The "circular dependency inside AuthModule" message is fired when one of AuthModule's `providers[i]` is `undefined` at scan time. Find which one with a single throwaway spec:

```ts
// test/cycle-debug.e2e-spec.ts
import { AuthModule } from '../src/auth/auth.module'
import { NestAppE2EModule } from '../src/nest-app/nest-app.e2e.module'

it('scans modules for undefined entries', () => {
  const visited = new Set<unknown>()
  const queue: unknown[] = [NestAppE2EModule]
  const violations: string[] = []
  const resolve = (v: unknown): unknown => {
    if (v == null) return null
    if (typeof v === 'function') return v
    // forwardRef returns { forwardRef: () => Module }
    const fr = (v as { forwardRef?: () => unknown }).forwardRef
    if (typeof fr === 'function') return fr() ?? null
    const dm = (v as { module?: unknown }).module
    if (typeof dm === 'function') return dm
    return null
  }
  while (queue.length) {
    const mod = queue.shift()
    if (!mod || visited.has(mod)) continue
    visited.add(mod)
    const name = (mod as { name?: string }).name ?? '<anon>'
    for (const key of ['imports', 'providers', 'exports'] as const) {
      const arr = (Reflect.getMetadata(key, mod) ?? []) as unknown[]
      arr.forEach((v, i) => {
        if (v == null) violations.push(`${name}.${key}[${i}] = UNDEFINED`)
        const r = resolve(v)
        if (r && key === 'imports') queue.push(r)
      })
    }
  }
  console.log(violations.length ? violations.join('\n') : `clean (${visited.size} modules)`)
  expect(violations).toEqual([])
})
```

Run this *with the failing spec also present* - the cycle only fires when both files are loaded. The output names the exact module + position, e.g. `AuthModule.providers[0] = UNDEFINED` → cross-reference with `AuthModule`'s `providers:` array to find the offending class (in this example, `AuthService`).

**Step 3 - Print the load order.** Drop two `console.log` lines into the suspected module and its service:

```ts
// auth.module.ts (top, after imports)
console.log('[load] auth.module.ts BEGIN')
// ... @Module decorator at the bottom
console.log('[load] auth.module.ts END  AuthService=', typeof AuthService === 'function' ? 'CLASS' : String(AuthService))

// auth.service.ts (top, after imports)
console.log('[load] auth.service.ts BEGIN')
// ... at the bottom of the file
console.log('[load] auth.service.ts END')
```

Run with `vitest run ... --disable-console-intercept`. The expected (healthy) order is:

```
[load] auth.service.ts BEGIN
[load] auth.service.ts END
[load] auth.module.ts BEGIN
[load] auth.module.ts END  AuthService= CLASS
```

The broken order is:

```
[load] auth.module.ts BEGIN
[load] auth.module.ts END  AuthService= undefined   ← cycle confirmed
[load] auth.service.ts BEGIN
[load] auth.service.ts END
```

When the module finishes before the service even begins, a third file is pulling the module in *during* the service's load - that's the closing edge of the cycle. Look at the chain by adding the same logs to suspects (`@/<feature>` barrels, `<feature>/<feature>.module.ts`).

**Step 4 - Fix the closing edge.** The common closing edge is a barrel re-export (Rule 5 above). Change the value-side `import` in the service file from the barrel to a concrete file path:

```diff
-import { AnalyticsService } from '@/analytics'
+import { AnalyticsService } from '@/analytics/analytics.service'
```

Re-run; the load order flips to the healthy shape and the scan reports clean.

**Step 5 - Remove the diagnostic.** Delete the throwaway spec and the `console.log` lines.

If you've applied Rules 1-4 and you're still seeing the error, it's almost always Rule 5 + a barrel re-export. The grep that catches this class of bug across an entire repo:

```bash
# Service-side files (NOT *.module.ts) importing from a feature barrel
grep -rn "from '@/[a-z-]*'" src --include='*.service.ts' --include='*.controller.ts' --include='*.resolver.ts'
```

Every match is a suspect - replace with the concrete file path or remove the barrel's module re-export.

## Why this pattern saves the day

NestJS resolves the dependency graph at boot. When Module A imports Module B which imports Module A, Nest can't pick a starting point and throws `Nest can't resolve dependencies` or `Cannot read properties of undefined`. `forwardRef` defers the resolution until both modules have been constructed, breaking the deadlock.

Rule 5 closes a second gap that `forwardRef` alone can't reach: the **JavaScript module-load graph**, where a single barrel re-export silently pulls a sibling module into the wrong evaluation order under Vite. Rules 1-4 + Rule 5 together make the entire backend immune to this class of bug.

The "always do this for cross-feature deps" rule pays its tiny verbosity tax in exchange for never seeing this class of bug.
