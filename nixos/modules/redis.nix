# Redis 7 for Warm Template.
#
# NixOS's services.redis.servers."" module gives us the systemd unit, the
# config file, and the systemd hardening for free.
#
# Defaults:
#   - bind 127.0.0.1 + ::1 (TCP loopback, no public exposure)
#   - 256MB cap, noeviction policy for BullMQ safety, AOF every-second fsync
#   - logs to journald

{ config, lib, pkgs, ... }:

let
  cfg = config.playcode;
  redisEnabled = cfg.database.redis.enable;
in {
  config = lib.mkIf redisEnabled {
    services.redis.servers."" = {
      enable = true;
      # `package` is top-level (`services.redis.package`), not per-server.
      # Defaults to `pkgs.redis`; override there if needed.

      # Loopback only. The app talks to Redis on the same host.
      bind = "127.0.0.1 ::1";
      port = 6379;

      # Memory + eviction
      settings = {
        maxmemory = "256mb";
        maxmemory-policy = "noeviction";
        timeout = 0;
        tcp-keepalive = 300;
        databases = 16;

        # RDB snapshots. `save` is `listOf str`, one entry per
        # `<seconds> <changes>` pair.
        save = [ "3600 1" "300 100" "60 10000" ];

        # AOF for durability - `appendfsync everysec` is the standard
        # cache-and-queue compromise (lose at most 1s of writes on crash).
        appendonly = "yes";
        appendfilename = "appendonly.aof";
        appendfsync = "everysec";

        # Tuning that mirrored the old role
        tcp-backlog = 511;
        maxclients = 10000;
        hz = 10;

        # Slow log - useful for debugging cache misses but small enough to forget about
        slowlog-log-slower-than = 10000;
        slowlog-max-len = 128;

        # Client output buffer limits matching the old role
        client-output-buffer-limit = [
          "normal 0 0 0"
          "replica 256mb 64mb 60"
          "pubsub 32mb 8mb 60"
        ];

        protected-mode = "yes";
      };
    } // lib.optionalAttrs (cfg.database.redis.password != "") {
      requirePass = cfg.database.redis.password;
    };
  };
}
