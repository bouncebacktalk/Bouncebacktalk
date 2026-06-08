# NixOS configuration for Warm Template.
#
# Top-level entry. Imports the modular structure that replaces the
# Ansible roles (base, traefik, caddy, postgres, redis, app):
#
#   modules/options.nix    - declares the playcode.* option tree
#   modules/toolchain.nix  - node, pnpm, python, ansible, git, rg, fd,
#                            nix-ld libs (per-template, not in base)
#   modules/traefik.nix    - edge router on app_port (was roles/traefik)
#   modules/caddy.nix      - internal static-file server   (was roles/caddy)
#   modules/postgres.nix   - Postgres 17 + per-project DB  (was roles/postgresql)
#   modules/redis.nix      - Redis with AOF persistence    (was roles/redis)
#   modules/app.nix        - systemd units for frontend/backend (was roles/app)
#   modules/playwright.nix - chromium for e2e tests, dev VMs only
#
# Per-project values come from `project.nix` - at bake time the cloud-template
# role substitutes scaffold placeholders; at user-provision time the
# project-app saga overwrites this file with user-specific values
# (PROJECT_NAME, ports, vault passwords, frontend/backend/legacy flags) before
# running `nixos-rebuild switch`.
#
# To rebuild the system after editing:
#
#     sudo nixos-rebuild switch
#
# To preview changes without applying:
#
#     sudo nixos-rebuild dry-activate
#
# To inspect generated systemd units:
#
#     systemctl cat playcode-frontend.service
#
# Boot-time invariants (provided by the VM's base image - these are not
# managed from this flake):
#   - boot.isContainer = true (no bootloader, no kernel build)
#   - app user (uid 1000) + sudo, sshd auto-enabled
#   - bash + coreutils + curl + sudo + util-linux + cacert + openssh on PATH
#
# nix-ld is in modules/toolchain.nix (needed for prebuilt Node binaries).

{ config, pkgs, lib, ... }:

{
  imports = [
    ./modules/options.nix
    ./modules/boot.nix
    ./modules/toolchain.nix
    ./modules/traefik.nix
    ./modules/caddy.nix
    ./modules/postgres.nix
    ./modules/redis.nix
    ./modules/app.nix
    ./modules/playwright.nix
    ./project.nix
  ];

  # Pinned to the VM's base image. Mismatch causes eval errors when running
  # `nixos-rebuild switch`. Bump only when the underlying NixOS image moves.
  system.stateVersion = "25.11";
}
