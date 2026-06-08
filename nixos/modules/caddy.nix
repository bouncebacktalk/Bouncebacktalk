# Caddy static-file server for Warm Template.
#
# Caddy here is **static-files-only**. Vike's Express layer at frontend/
# does the SSR work. Traefik routes /assets/* to this Caddy on `staticPort`,
# /api/* to the backend, /* to the Vike SSR frontend.
#
# In **SPA + prod mode** (browser-imported projects, services.mode = "prod"),
# Caddy IS the / handler: Traefik routes /* here and Caddy serves the
# built SPA out of `frontend-spa/dist/` with the usual SPA fallback to
# `index.html`. The build comes from `pnpm -r build` (vite build) in the
# deploy script.
#
# In **SPA + dev mode** (services.mode = "dev"), Caddy is bypassed:
# Traefik sends /* to `playcode-frontend-spa.service` (= `vite dev`)
# so HMR works. Caddy stays enabled either way, the static-port route
# is harmless when nothing reaches it.

{ config, lib, pkgs, ... }:

let
  cfg = config.playcode;
  staticRoot = "${cfg.paths.workspace}/frontend/dist/client";
  spaRoot = "${cfg.paths.workspace}/frontend-spa/dist";
in {
  services.caddy = {
    enable = true;
    package = pkgs.caddy;

    # Disable HTTPS issuance. Traefik fronts Caddy on loopback, the edge
    # proxy fronts Traefik. Caddy never sees public traffic.
    globalConfig = ''
      auto_https off
    '';

    # NOTE on directive ordering: block-form `header { ... }` directly inside
    # a `handle` adapts to a separate route in Caddy's JSON config WITH NO MATCHER.
    # That route then matches every request, runs first inside the subroute,
    # and TERMINATES handling. file_server downstream never runs and the
    # response is empty `200 OK`. (Verified live on prod-1374214 on 2026-05-18:
    # Caddy returned `Content-Length: 0` with no Content-Type for every path.)
    #
    # Historical fix: lift block-form `header { ... }` to the site level
    # outside `handle`. The SPA cache split below uses simple `header Name value`
    # directives inside mutually exclusive handles; keep that shape unless you
    # re-check the adapted Caddy JSON.
    #
    # NOTE on the site key: we use `:<port>` (port-only) rather than
    # `http://127.0.0.1:<port>` because the latter ADDS a `Host: 127.0.0.1`
    # matcher to every route. Traefik forwards the original Host header
    # downstream (`prod-1374214.playcodepreview.cc`, for instance), which
    # doesn't match `127.0.0.1`. Caddy falls through to its default 200
    # empty response with no Content-Type, breaking the preview. The
    # port-only form binds to all interfaces and matches any Host.
    virtualHosts.":${toString cfg.network.staticPort}".extraConfig =
      if cfg.services.spaMode then ''
        # SPA mode: Vite-generated /assets/* filenames are fingerprinted, but
        # root-level files copied from public/ are stable mutable URLs.
        root * ${spaRoot}

        handle /caddy-health {
          respond "OK" 200
        }

        handle /assets/* {
          header Cache-Control "public, max-age=31536000, immutable"
          header X-Content-Type-Options "nosniff"
          file_server {
            hide .*
            precompressed br gzip zstd
          }
        }

        handle {
          header Cache-Control "no-store, no-cache, must-revalidate, max-age=0"
          header Pragma "no-cache"
          header Expires "0"
          header X-Content-Type-Options "nosniff"
          try_files {path} /index.html
          file_server {
            hide .*
            precompressed br gzip zstd
          }
        }

        encode gzip zstd
      '' else ''
        # Long cache: Vike fingerprints filenames so this is safe.
        header /assets/* Cache-Control "public, max-age=31536000, immutable"
        header /assets/* X-Content-Type-Options "nosniff"

        # Vike SSR: only /assets/*. Vike's Express server serves /
        handle /assets/* {
          root * ${staticRoot}
          file_server {
            hide .*
            precompressed br gzip zstd
          }
        }

        handle /caddy-health {
          respond "OK" 200
        }

        handle {
          respond "Not Found" 404
        }

        encode gzip zstd
      '';
  };
}
