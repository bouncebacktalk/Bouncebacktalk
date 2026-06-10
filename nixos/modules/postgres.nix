# PostgreSQL 17 for Warm Template.
#
# NixOS's services.postgresql module does most of the work declaratively.
# Postgres is ON by default for the full-stack starter.
#
# Notes:
#   - Backups are out of scope for this module - add one (WAL-G,
#     pg_basebackup, pg_dump cron, etc.) when you're ready for prod.
#   - pgvector is available in nixpkgs - uncomment its line below to enable.
#   - TCP is loopback-only. Nothing binds to the public VM interface.

{ config, lib, pkgs, ... }:

let
  cfg = config.playcode;
  pgEnabled = cfg.database.postgres.enable;
  appRoleDbPrivilege = if cfg.services.mode == "dev" then "CREATEDB" else "NOCREATEDB";
in {
  config = lib.mkIf pgEnabled {
    services.postgresql = {
      enable = true;
      package = pkgs.postgresql_17;
      enableTCPIP = true;

      # Conservative tuning for a small VM (1-2 GB RAM). Bump
      # shared_buffers / effective_cache_size proportional to total RAM
      # if your VM is bigger.
      settings = {
        listen_addresses = lib.mkForce "127.0.0.1,::1";
        max_connections = 100;
        shared_buffers = "128MB";
        effective_cache_size = "1GB";
        work_mem = "4MB";
        maintenance_work_mem = "64MB";
        random_page_cost = 4.0;
      };

      # pg_hba.conf - local + loopback only, scram-sha-256 for hosts.
      # Mirrors the Ansible role exactly.
      authentication = lib.mkOverride 10 ''
        # TYPE  DATABASE  USER      ADDRESS         METHOD
        local   all       postgres                  peer
        local   all       all                       peer
        host    all       all       127.0.0.1/32    scram-sha-256
        host    all       all       ::1/128         scram-sha-256
      '';

      ensureDatabases = [ cfg.project.name ];
      ensureUsers = [
        {
          name = cfg.user.name;
          # `true` would force a same-named database to exist; we want
          # app to own `<projectName>` instead. Granted below.
          ensureDBOwnership = false;
        }
      ];
    };

    # Configure the app DB user from .env.local so secrets never enter
    # committed Nix files or the Nix store.
    systemd.services.playcode-postgresql-configure-app = lib.mkIf pgEnabled {
      description = "Configure the app Postgres user and database";
      after = [ "postgresql.service" ];
      wantedBy = [ "multi-user.target" ];
      requires = [ "postgresql.service" ];
      unitConfig = {
        ConditionPathExists = "!${cfg.paths.workspace}/.bake-mode";
      };
      serviceConfig = {
        Type = "oneshot";
        User = "postgres";
        EnvironmentFile = [
          "-${cfg.paths.configDir}/playcode-backend.env"
          "-${cfg.paths.workspace}/.env.local"
        ];
      };
      # Password comes from systemd's EnvironmentFile, not from Nix.
      script = ''
        if [ -z "''${POSTGRES_PASSWORD:-}" ]; then
          echo "POSTGRES_PASSWORD is missing from ${cfg.paths.workspace}/.env.local" >&2
          exit 1
        fi

        role_exists="$(${pkgs.postgresql_17}/bin/psql -v ON_ERROR_STOP=1 -tAc "SELECT 1 FROM pg_roles WHERE rolname = '${cfg.user.name}'" postgres)"
        if [ "$role_exists" != "1" ]; then
          ${pkgs.postgresql_17}/bin/psql -v ON_ERROR_STOP=1 postgres \
            -c "CREATE ROLE \"${cfg.user.name}\" LOGIN;"
        fi

        db_exists="$(${pkgs.postgresql_17}/bin/psql -v ON_ERROR_STOP=1 -tAc "SELECT 1 FROM pg_database WHERE datname = '${cfg.project.name}'" postgres)"
        if [ "$db_exists" != "1" ]; then
          ${pkgs.postgresql_17}/bin/psql -v ON_ERROR_STOP=1 postgres \
            -c "CREATE DATABASE \"${cfg.project.name}\" OWNER \"${cfg.user.name}\";"
        fi

        printf '%s\n' "ALTER USER \"${cfg.user.name}\" WITH PASSWORD :'app_password' ${appRoleDbPrivilege};" | \
        ${pkgs.postgresql_17}/bin/psql \
          -v ON_ERROR_STOP=1 \
          -v app_password="''${POSTGRES_PASSWORD}" \
          postgres

        ${pkgs.postgresql_17}/bin/psql -v ON_ERROR_STOP=1 postgres \
          -c "ALTER DATABASE \"${cfg.project.name}\" OWNER TO \"${cfg.user.name}\";"
      '';
    };
  };
}
