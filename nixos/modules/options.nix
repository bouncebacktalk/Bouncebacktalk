# NixOS module options for the Warm Template cloud project.
#
# Centralises all per-project values under one option tree (`playcode.*`).
# Bake-time defaults live here. Per-user overrides come from `project.nix`,
# which is rewritten on every provision/promote pass with the user's
# specific values.
#
# Why options instead of bare let-bindings: NixOS modules can layer (every
# imported module sees the merged config), and option types catch wrong-type
# overrides at eval time instead of at runtime when the systemd unit fails to
# start. Also: `nixos-option playcode.network.appPort` from inside the VM
# gives a self-documenting "what is this thing" experience that helps when
# debugging a misconfigured project.

{ config, lib, ... }:

with lib;

{
  options.playcode = {

    project = {
      name = mkOption {
        type = types.str;
        description = "Lowercase + dashes project identifier. Used as the database name and as the systemd unit prefix.";
        example = "my-app";
      };
      title = mkOption {
        type = types.str;
        description = "Human-readable project title. Shown in [Unit] Description= of generated systemd units.";
        example = "My App";
      };
    };

    network = {
      appPort = mkOption {
        type = types.port;
        description = "Public-facing port. Traefik listens here; the platform forwards external traffic to it.";
      };
      frontendPort = mkOption {
        type = types.port;
        default = 3010;
        description = "Internal port for the frontend service (Vike SSR by default, Vite SPA dev server when `spaMode = true`).";
      };
      backendPort = mkOption {
        type = types.port;
        default = 3011;
        description = "Internal port for the NestJS backend.";
      };
      staticPort = mkOption {
        type = types.port;
        default = 3012;
        description = "Internal port for the Caddy static-file server (serves /assets/*).";
      };
    };

    services = {
      frontend.enable = mkOption {
        type = types.bool;
        default = true;
        description = "Enable the Vike SSR frontend systemd unit. Browser-imported projects use `spaMode = true` and run a Vite-only SPA unit instead.";
      };
      backend.enable = mkOption {
        type = types.bool;
        default = true;
        description = "Enable the NestJS backend systemd unit.";
      };
      spaMode = mkOption {
        type = types.bool;
        default = false;
        description = ''
          When true, route all `/` traffic to a Vite-only Single Page App
          server in `frontend-spa/` instead of the Vike SSR frontend. Caddy
          stops serving /assets/* and Traefik flips its routing tree. Set
          automatically by the provisioning saga when a browser-only project
          is imported to cloud. `frontend/` (Vike SSR) and `frontend-spa/`
          coexist on disk but only one serves `/` at any time - the agent
          helps the user migrate gradually.
        '';
      };
      mode = mkOption {
        type = types.enum [ "dev" "prod" ];
        default = "dev";
        description = ''
          `dev` runs `pnpm dev` (HMR, no build). `prod` runs `pnpm -r build`
          once at activation, then `pnpm start`. `deploy.sh` overrides this
          to `prod` at deploy time via the `.#prod` flake output.
        '';
      };
    };

    database = {
      postgres.enable = mkOption {
        type = types.bool;
        default = true;
        description = "Provision PostgreSQL 17 + per-project database. On by default so new projects can persist users and app data immediately.";
      };
      postgres.password = mkOption {
        type = types.str;
        default = "";
        description = "Optional password for the `app` Postgres user. Leave empty for provision-time POSTGRES_PASSWORD from .env.local.";
      };
      redis.enable = mkOption {
        type = types.bool;
        default = true;
        description = "Provision Redis 7 with AOF persistence on loopback. Used by the default BullMQ email queue.";
      };
      redis.password = mkOption {
        type = types.str;
        default = "";
        description = "Optional Redis AUTH password. Empty means no password on loopback-only Redis.";
      };
    };

    repo = {
      url = mkOption {
        type = types.str;
        default = "";
        description = "Git origin URL for the user's repo. Filled in by sky-api at provision time.";
      };
      ref = mkOption {
        type = types.str;
        default = "main";
        description = "Git ref to track (branch name).";
      };
    };

    paths = {
      workspace = mkOption {
        type = types.path;
        default = "/srv/workspace";
        description = ''
          Filesystem location of the cloned user repo. Systemd units'
          WorkingDirectory= resolves relative to this. The cloud-template
          bake creates /workspace as a convenience symlink → /srv/workspace.
        '';
      };
      configDir = mkOption {
        type = types.path;
        default = "/etc/playcode-app";
        description = "Where per-service env files (`<name>.env`) are written.";
      };
    };

    user = {
      name = mkOption {
        type = types.str;
        default = "app";
        description = "Linux user that owns the workspace and runs frontend/backend services.";
      };
      group = mkOption {
        type = types.str;
        default = "app";
        description = "Primary group for the app user.";
      };
    };
  };
}
