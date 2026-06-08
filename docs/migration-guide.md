# Migration guide

This project ships a custom build step we didn't recognise. Your code lives at `frontend-spa/` and the configured build command runs on every deploy.

You don't need to migrate. The legacy SPA at `frontend-spa/` keeps
working as long as you do nothing. Caddy serves it at `/`, your
existing builds still run. The two paths below are *opt-in* upgrades you
can take when you want them.

## Path A: Add SSR (Vike)

Use this if you want server-side rendering (better SEO, faster
first-paint, social-card meta tags). Cost: rewriting your route entries.

1. **Move pages.** For each route in `frontend-spa/` that returns a
   full HTML page (typically a top-level component), create a matching
   file under `frontend/pages/`:
   - `frontend-spa/src/Home.tsx` → `frontend/pages/index/+Page.tsx`
   - `frontend-spa/src/About.tsx` → `frontend/pages/about/+Page.tsx`

   Vike's convention is `pages/<route>/+Page.{tsx,vue}`. The component
   itself usually transfers verbatim. Vike doesn't require you to
   change React/Vue idioms.

2. **Move shared assets.** Keep stable filenames such as `robots.txt`
   and favicons in `frontend/public/`. Move production-cacheable images,
   fonts, and CSS assets under `frontend/assets/` (or another source
   directory) and import them from code so Vite emits fingerprinted
   `/assets/name.<hash>.*` URLs. Do not move cacheable media from
   `frontend-spa/public/` to `frontend/public/` unless the stable URL is
   intentional.

3. **Flip the inventory flag.** Edit
   `ansible/inventories/dev/group_vars/all/z-legacy.yml`:
   ```yaml
   legacy_mode: false
   frontend_enabled: true
   ```
   Re-run `ansible-playbook -c local -i inventories/dev/hosts.yml    playbooks/setup.yml`. Vike takes over `/`; `frontend-spa/` stays
   on disk as your archive.

## Path B: Add a backend (NestJS)

Use this if you need server-side state, auth, or external API proxying
without standing up a separate service.

1. **Write your endpoints.** `backend-nest/src/` ships with a working
   `HealthController`. Add controllers under `backend-nest/src/` (or
   sub-modules); NestJS's CLI (`npx nest generate controller foo`)
   scaffolds them.

2. **Call them from the SPA.** Endpoints land at `/api/*` thanks to the
   Traefik route already in
   `ansible/roles/traefik/templates/dynamic.yml.j2`:
   ```ts
   await fetch('/api/your-endpoint', { method: 'POST', body: JSON.stringify(...) })
   ```

3. **Flip the flag.** In
   `ansible/inventories/dev/group_vars/all/z-legacy.yml`:
   ```yaml
   backend_enabled: true
   ```
   Re-run the playbook. Backend comes up on the internal upstream port
   (3011), Traefik routes `/api/*` to it. The legacy SPA at `/` is
   untouched.

## Both at once

Flipping both `legacy_mode: false` and `frontend_enabled: true` and
`backend_enabled: true` migrates fully to the canonical template. At
that point `frontend-spa/` is dead weight. You can `git rm -r`
it whenever you're confident the migration is complete.

## What was detected

- **Framework**: unknown-bundled
- **Build step needed**: yes (`pnpm build`)
- **Caddy serves**: `frontend-spa/dist`
- **Files matched**: `package.json`, `index.html`
