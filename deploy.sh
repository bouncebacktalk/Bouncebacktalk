#!/usr/bin/env bash
# Deploy script - runs on every publish. Edit freely.
#
# Each `echo "==> step N"` line streams live into the deploy panel so you
# (and your team) can watch the build progress.

# sky-guest invokes us via `bash -c` (non-login shell), so /etc/profile
# is NOT sourced automatically. NixOS exports its `environment.session-
# Variables` (PATH additions, PRISMA_QUERY_ENGINE_LIBRARY, PRISMA_SCHEMA_
# ENGINE_BINARY, etc. - see nixos/modules/toolchain.nix) into
# /etc/profile.d/*.sh, so without this `source` the next `pnpm install`
# can't find prisma-engines and falls back to its libssl probe, which
# warns `Prisma failed to detect the libssl/openssl version` on NixOS
# (no FHS libs in /lib). Sourcing the profile pulls the env vars in
# and the warning goes away.
# shellcheck disable=SC1091
[ -r /etc/profile ] && . /etc/profile

# Headless context - no TTY available. CI=true is the standard signal
# tools recognize (pnpm, vitest, jest, prettier, eslint, ...) to disable
# interactive prompts and progress bars via the `is-ci` package. Set
# once here so any tool later added to this script behaves headless by
# default without per-tool flags.
export CI=true

set -e

cd "${WORKSPACE_DIR:-/srv/workspace}"

if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.local
  set +a
fi

echo "==> 1/6 swap NixOS config to prod mode"
sudo nixos-rebuild switch --flake ./nixos#prod --fast

echo "==> 2/6 ensure database role and database"
if systemctl cat playcode-postgresql-configure-app.service >/dev/null 2>&1; then
  sudo systemctl restart playcode-postgresql-configure-app.service
else
  echo "Postgres app configure service is not enabled; skipping database bootstrap"
fi

echo "==> 3/6 install workspace deps (frozen lockfile)"
pnpm install --frozen-lockfile

echo "==> 4/6 apply database migrations"
if [ -n "${DATABASE_URL:-}" ] && [ -d backend-nest/prisma/migrations ]; then
  (cd backend-nest && pnpm prisma:migrate:deploy)
else
  echo "No DATABASE_URL or migrations directory; skipping migrations"
fi

echo "==> 5/6 build all workspace packages"
pnpm -r build

# Restart whichever services are enabled. Glob covers both the Vike SSR
# (`playcode-frontend`) and browser-imported SPA (`playcode-frontend-spa`)
# variants. `systemctl restart` is a no-op for units that aren't loaded.
echo "==> 6/6 restart user-app services"
sudo systemctl restart 'playcode-*.service'

echo "==> deploy.sh finished OK"
