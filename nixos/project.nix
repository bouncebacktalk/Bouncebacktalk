# Per-project values for Warm Template.
#
# This is YOUR file. Edit the values below - project name, public port,
# enable/disable flags - and run:
#
#     sudo nixos-rebuild switch --flake /workspace/nixos#default --fast
#
# The platform pre-fills the placeholders at provision time.

{ config, lib, ... }:

{
  playcode = {
    project = {
      name = "warm-template";
      title = "Warm Template";
    };

    network = {
      appPort = 3001;
      # Internal upstreams - must not collide with appPort.
      frontendPort = 3010;
      backendPort = 3011;
      staticPort = 3012;
    };

    services = {
      frontend.enable = true;
      backend.enable = true;
      spaMode = false;
      mode = "dev";
    };

    database = {
      # ON by default - the starter is ready for business-app work immediately.
      postgres.enable = true;
      redis.enable = true;

      # Passwords are not stored in committed Nix files. setup.sh creates
      # .env.local with POSTGRES_PASSWORD, DATABASE_URL, and Redis settings.
      postgres.password = "";
      redis.password = "";
    };

    repo = {
      # Filled in by the saga at deploy-trigger time.
      url = "";
      ref = "main";
    };
  };
}
