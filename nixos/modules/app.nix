# App systemd units for Warm Template.
#
# Generates one systemd unit per enabled flavour of frontend/backend.
#
# Frontend flavours (mutually exclusive - only one binds `frontendPort`):
#   playcode-frontend       - Vike SSR (default for fresh projects)
#   playcode-frontend-spa   - Vite-only Single Page App dev server
#                             (browser-imported projects)
#
# Backend (playcode-backend) is independent.
#
# Per-service env files render to /etc/playcode-app/<name>.env. Override
# values by editing `nixos/project.nix` and re-running `nixos-rebuild switch`,
# or by adding a `.env.local` in the workspace root that systemd reads via
# `EnvironmentFile=`.

{ config, lib, pkgs, ... }:

let
  cfg = config.playcode;
  user = cfg.user.name;
  group = cfg.user.group;
  ws = cfg.paths.workspace;

  isDev = cfg.services.mode == "dev";

  prismaSystemdEnvironment = [
    "PKG_CONFIG_PATH=${pkgs.openssl.dev}/lib/pkgconfig"
    "PRISMA_SCHEMA_ENGINE_BINARY=${pkgs.prisma-engines}/bin/schema-engine"
    # Prisma 7 currently asks binaries.prisma.sh for a linux-nixos
    # schema-engine checksum even when the binary path is pinned. That
    # checksum URL can 404; the pinned Nix store path is the trust anchor.
    "PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1"
  ];

  # Common unit knobs. ConditionPathExists is the bake-time quiesce gate:
  # ansible/roles/cloud-template/tasks/main.yml touches/removes
  # ${ws}/.bake-mode around the post-reboot chown + pnpm install.
  baseService = name: pkgPath: extra: {
    description = "${cfg.project.title} ${name}";
    after = [ "network.target" ] ++ (extra.afterUnits or []);
    wants = [ "network-online.target" ] ++ (extra.wantsUnits or []);
    requires = extra.requiresUnits or [];
    wantedBy = [ "multi-user.target" ];
    unitConfig = {
      ConditionPathExists = "!${ws}/.bake-mode";
    };
    serviceConfig = {
      Type = "simple";
      User = user;
      Group = group;
      WorkingDirectory = "${ws}/${pkgPath}";
      EnvironmentFile = [ "${cfg.paths.configDir}/${name}.env" ] ++ (extra.environmentFiles or []);
      Environment = [ "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/run/current-system/sw/bin" ] ++ prismaSystemdEnvironment;
      ExecStart = extra.execStart;
      Restart = "always";
      RestartSec = 2;
      StandardOutput = "journal";
      StandardError = "journal";
      SyslogIdentifier = name;
      LimitNOFILE = 65536;
    } // (extra.serviceConfig or {});
  };

  pnpm = "${pkgs.pnpm}/bin/pnpm";

  frontendUnit = baseService "playcode-frontend" "frontend" {
    execStart = "${pnpm} ${if isDev then "dev" else "start"}";
  };

  # Browser-imported projects land their source tree in frontend-spa/. In
  # dev mode this unit runs `pnpm dev` (Vite dev server with HMR) so
  # Traefik can proxy /* to it for live editing. In prod mode this unit
  # is NOT enabled: the production serving path is Caddy → frontend-spa/
  # dist/ (built by `pnpm -r build` in deploy.sh, served as static files
  # with SPA fallback). `vite preview` is a local build-validation tool,
  # not a production serving tier.
  frontendSpaUnit = baseService "playcode-frontend-spa" "frontend-spa" {
    execStart = "${pnpm} dev";
  };

  backendUnit = baseService "playcode-backend" "backend-nest" {
    execStart = "${pnpm} ${if isDev then "start:dev" else "start:prod"}";
    environmentFiles = [ "-${ws}/.env.local" ];
    afterUnits = [
      "playcode-frontend.service"
      "playcode-frontend-spa.service"
    ] ++ lib.optional cfg.database.postgres.enable "playcode-postgresql-configure-app.service"
      ++ lib.optional cfg.database.redis.enable "redis.service";
    wantsUnits =
      lib.optional cfg.database.postgres.enable "playcode-postgresql-configure-app.service"
      ++ lib.optional cfg.database.redis.enable "redis.service";
    requiresUnits =
      lib.optional cfg.database.postgres.enable "playcode-postgresql-configure-app.service";
    serviceConfig = lib.optionalAttrs cfg.database.postgres.enable {
      ExecStartPre = "${pnpm} prisma:migrate:deploy";
    };
  };

in {
  # Make sure the per-service config dir exists; env files are written
  # there by the project-app saga at provision time (or hand-edited).
  systemd.tmpfiles.rules = [
    "d ${cfg.paths.configDir} 0755 root root - -"
  ];

  systemd.services = lib.mkMerge [
    (lib.mkIf (cfg.services.frontend.enable && !cfg.services.spaMode) {
      "playcode-frontend" = frontendUnit;
    })
    (lib.mkIf (cfg.services.spaMode && isDev) {
      "playcode-frontend-spa" = frontendSpaUnit;
    })
    (lib.mkIf cfg.services.backend.enable {
      "playcode-backend" = backendUnit;
    })
  ];

  # Default env-file values per service. Override by editing this module
  # (e.g. add new keys here, then `nixos-rebuild switch`) or by adding a
  # `.env.local` at the workspace root that systemd reads via `EnvironmentFile=`.
  environment.etc = lib.mkMerge [
    (lib.mkIf (cfg.services.frontend.enable && !cfg.services.spaMode) {
      "playcode-app/playcode-frontend.env".text = ''
        NODE_ENV=${if isDev then "development" else "production"}
        PORT=${toString cfg.network.frontendPort}
        HOST=0.0.0.0
      '';
    })
    (lib.mkIf (cfg.services.spaMode && isDev) {
      "playcode-app/playcode-frontend-spa.env".text = ''
        NODE_ENV=development
        PORT=${toString cfg.network.frontendPort}
        HOST=0.0.0.0
      '';
    })
    (lib.mkIf cfg.services.backend.enable {
      # mode 0640 group=app for future service-local secrets. Per-project
      # secrets generated by setup.sh live in the gitignored .env.local,
      # loaded by the backend unit as an optional override file.
      "playcode-app/playcode-backend.env" = {
        mode = "0640";
        group = group;
        # PUBLIC_URL points at the user-facing port (Traefik); the
        # backend uses it for password-reset links + CORS. In dev this
        # is localhost:<appPort>; for cloud-deployed projects, the
        # publish saga / user overrides this via .env.local with the
        # real public hostname (e.g. https://my-app.playcode.io).
        text = ''
          NODE_ENV=${if isDev then "development" else "production"}
          PORT=${toString cfg.network.backendPort}
          PUBLIC_URL=http://localhost:${toString cfg.network.appPort}
          JWT_ACCESS_SECRET=7d080d87dc20324d1803421904bbc16249bb578f81dd712612ddeda085307d3193bcd6d96d6e461992760c82d974ec29ef42befd3cac1ff42258247506bf69ea
          JWT_REFRESH_SECRET=e8c8b0598b67db07171937d06a0af8e97cbb20772bb229ac7137555d2d76d839e121677dedc59f90191e7258b9c2fa3227c07840dad2400d87674d8dce2c54cb
          JWT_ACCESS_TTL=7d
          JWT_REFRESH_TTL=30d
          AUTH_EXPOSE_ACCESS_TOKEN=true
          AUTH_COOKIE_SAME_SITE=lax
          ADMIN_EMAILS=bouncebacktalk@gmail.com
          MAIL_TRANSPORT=console
          MAIL_FROM="bouncebacktalk_app <noreply@bouncebacktalk.com>"
          OPENAI_API_KEY=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
          DATABASE_URL=postgresql://app:1855fc58d876eded8fbe1cfc7ea6fdffdf57ad079165a852215ccb70a5d7d011@127.0.0.1:5432/playcode-bouncebacktalk-app
          POSTGRES_PASSWORD=1855fc58d876eded8fbe1cfc7ea6fdffdf57ad079165a852215ccb70a5d7d011
          REDIS_URL=redis://127.0.0.1:6379
          SPORTSDATA_API_KEY=cd48920d0d784a2199d1ceefa5183f6b
          SPORTSDATA_MLB_KEY=9c2775f1e543be5b47419cf6fbef851
          ODDS_API_KEY=3987a37833bfdb5954366c952b713632
        '';
      };
    })
  ];

  # Ensure the workspace dir exists with the right ownership at activation
  # time. The first git clone into this directory happens on first boot.
  systemd.tmpfiles.settings."10-playcode-app"."${ws}".d = {
    user = user;
    group = group;
    mode = "0755";
  };
}
