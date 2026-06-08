# 03 - Deploy

How a system change goes from a `nixos/modules/*.nix` edit to the running VM, and how to roll back when it goes wrong.

## One button: nixos-rebuild

Every system change - new package, new systemd unit, service enablement, env-file schema - is a NixOS change. Edit the appropriate module under [`nixos/modules/`](../nixos/modules/), then:

```bash
sudo nixos-rebuild switch --flake /workspace/nixos#default --fast
```

That's it. NixOS evaluates the flake, builds the new system into `/nix/store`, atomically swaps `/run/current-system`, and starts/restarts only the units whose config changed. Failed evaluation never touches the running system. Failed activation rolls back automatically.

For **pure code edits** (frontend tsx, backend ts), skip nixos-rebuild - just restart the affected systemd unit:

```bash
sudo systemctl restart playcode-frontend
sudo systemctl restart playcode-backend
```

## Module map

```
nixos/
├── flake.nix              # entry point; pins nixpkgs, wires modules
├── project.nix            # per-project values (project name, ports, service flags)
└── modules/
    ├── options.nix        # playcode.* option schema (validated at eval time)
    ├── boot.nix           # base system (sshd, journald)
    ├── toolchain.nix      # node, pnpm, prisma engines, search/edit tools
    ├── app.nix            # playcode-frontend.service + playcode-backend.service
    ├── traefik.nix        # edge router on appPort
    ├── caddy.nix          # static-file server for /assets/*
    ├── postgres.nix       # services.postgresql + app DB/user setup
    └── redis.nix          # services.redis loopback queue backend
```

| You changed... | What rebuild does |
|---|---|
| A unit's `ExecStart` / env in `app.nix` | Regenerates the unit, restarts it |
| `traefik.nix` routing | Regenerates traefik config, reloads traefik |
| `postgres.nix` settings | Regenerates `postgresql.conf`, restarts postgres |
| `playcode.database.postgres.enable` / `redis.enable` in `project.nix` | Starts or stops the local data services |
| `toolchain.nix` package set | Updates `/run/current-system/sw`, no service restart needed |

## Generations and rollback

Every successful `nixos-rebuild switch` produces a numbered **generation**. List them:

```bash
sudo nix-env -p /nix/var/nix/profiles/system --list-generations
```

Roll back to the previous one:

```bash
sudo nixos-rebuild switch --rollback
```

Or pick a specific generation:

```bash
sudo /nix/var/nix/profiles/system-42-link/bin/switch-to-configuration switch
```

Generations stay on disk until garbage-collected (`nix-collect-garbage`). For deeper rollback (data loss, broken state), use the editor's **Sky snapshot** - that's a whole-VM rollback, not just system config.

## What's NOT a NixOS change

- **Code commits** - pushed to git, deployed by restarting the unit (`systemctl restart playcode-backend`).
- **Schema migrations** - dev uses `pnpm prisma:migrate`; backend start and `deploy.sh` run `pnpm prisma:migrate:deploy`. `deploy.sh` first restarts `playcode-postgresql-configure-app.service`, which creates the app database if missing and flips the app role to prod-safe `NOCREATEDB`.
- **Per-user secrets / .env.local** - edit the file directly; systemd re-reads on unit restart.

If you find yourself running `nixos-rebuild` for a code edit, you're double-paying - the dev server is already watching for code changes.

## Promoting to production

The same flake will deploy a permanent prod VM in Phase 2. Per-environment values live in `nixos/project.nix`; the flake wires them through `playcode.*` options. See [`docs/architecture/23-cloud-deploy-model.md`](../../../docs/architecture/23-cloud-deploy-model.md) for the canonical model.
