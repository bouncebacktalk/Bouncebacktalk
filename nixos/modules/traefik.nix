# Traefik edge router for Warm Template.
#
# Listens on `playcode.network.appPort` (3000 by default — the public port
# the edge proxy forwards to) and routes by URL path:
#
#   /api/*    → backend  (NestJS, only if backend enabled)
#
#   Non-SPA (Vike SSR — default for fresh projects):
#     /assets/* → static   (Caddy, Vike-built fingerprinted bundles)
#     /         → frontend (Vike SSR Express)
#
#   SPA + dev (browser-imported, services.mode = "dev"):
#     /         → frontend-spa (Vite dev server, HMR enabled)
#
#   SPA + prod (browser-imported, services.mode = "prod"):
#     /         → static (Caddy serves frontend-spa/dist/ with SPA fallback)
#
# Vite preview is intentionally NOT used in prod — it's a build-validation
# tool, not a serving tier. Caddy + the built artifact is the prod path.

{ config, lib, pkgs, ... }:

let
  cfg = config.playcode;
  spa = cfg.services.spaMode;
  isDev = cfg.services.mode == "dev";
  feEnabled = cfg.services.frontend.enable;
  beEnabled = cfg.services.backend.enable;

  spaVite = spa && isDev;
  spaCaddy = spa && !isDev;

  # `optionalAttrs` (vs `mkIf` + `filterAttrs`) is the correct way to
  # conditionally include keys in a Traefik router/service map. `mkIf false`
  # produces a special module-system value, not `null` — `filterAttrs (_: v:
  # v != null)` never prunes it, so the file provider sees ghost entries
  # and rejects the config at load time.
  routers =
    (lib.optionalAttrs beEnabled {
      api = { rule = "PathPrefix(`/api`)"; service = "backend"; entryPoints = [ "web" ]; priority = 100; };
    })
    // (lib.optionalAttrs spaVite {
      spa-frontend = { rule = "PathPrefix(`/`)"; service = "frontend-spa"; entryPoints = [ "web" ]; priority = 10; };
    })
    // (lib.optionalAttrs spaCaddy {
      spa-static = { rule = "PathPrefix(`/`)"; service = "static"; entryPoints = [ "web" ]; priority = 10; };
    })
    // (lib.optionalAttrs (!spa) {
      static = { rule = "PathPrefix(`/assets`)"; service = "static"; entryPoints = [ "web" ]; priority = 50; };
    })
    // (lib.optionalAttrs (!spa && feEnabled) {
      frontend = { rule = "PathPrefix(`/`)"; service = "frontend"; entryPoints = [ "web" ]; priority = 10; };
    });

  services =
    (lib.optionalAttrs beEnabled {
      backend.loadBalancer.servers = [{ url = "http://127.0.0.1:${toString cfg.network.backendPort}"; }];
    })
    // (lib.optionalAttrs (!spa || spaCaddy) {
      static.loadBalancer.servers = [{ url = "http://127.0.0.1:${toString cfg.network.staticPort}"; }];
    })
    // (lib.optionalAttrs spaVite {
      frontend-spa.loadBalancer.servers = [{ url = "http://127.0.0.1:${toString cfg.network.frontendPort}"; }];
    })
    // (lib.optionalAttrs (!spa && feEnabled) {
      frontend.loadBalancer.servers = [{ url = "http://127.0.0.1:${toString cfg.network.frontendPort}"; }];
    });

in {
  services.traefik = {
    enable = true;

    staticConfigOptions = {
      global = {
        checkNewVersion = false;
        sendAnonymousUsage = false;
      };
      entryPoints.web.address = ":${toString cfg.network.appPort}";
      api = {
        dashboard = false;
        insecure = false;
      };
      log = {
        level = "INFO";
        # The NixOS module routes traefik logs to systemd-journald by default
        # (via StandardOutput=journal in the unit). No need for filePath.
      };
    };

    # NixOS's services.traefik supports an inline dynamic config; it
    # synthesises a YAML file under /etc/traefik/dynamic.yaml and points
    # the file provider at it.
    dynamicConfigOptions = {
      http = {
        inherit routers services;
      };
    };
  };

  # Open the public port at the firewall layer so the edge proxy can
  # reach it. The host-level firewall in `boot.nix` is already off; this
  # is for any host firewall NixOS might still expose.
  networking.firewall.allowedTCPPorts = [ cfg.network.appPort ];
}
