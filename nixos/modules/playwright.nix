# Chromium for end-to-end tests (dev VMs only).
#
# # Two browser sources, only one is right on NixOS
#
# Playwright normally downloads its own browser builds (`playwright install`).
# Those assume an FHS layout (/lib64/ld-linux..., system libs on standard
# paths) that NixOS does not provide, so they will not launch here. On NixOS
# you therefore do NOT run `playwright install` at all - the browser comes
# entirely from Nix, via `playwright-driver.browsers*`, which is the same
# browser revision Playwright ships, already patched to run on NixOS.
#
# We use `browsers-chromium`, NOT `browsers`: the full `browsers` bundles
# chromium + firefox + webkit (~1 GB closure), and our tests only drive
# chromium. `browsers-chromium` is chromium alone (~300 MB) -> a much smaller
# realization, which matters because the VM's disk is NBD-backed and a large
# I/O burst on `nixos-rebuild` is rough on it (see
# docs/sky/bugs/sky-agent.md - "NBD process crashes under sustained heavy I/O").
#
# `playwright.config.ts` finds the chromium binary under PLAYWRIGHT_BROWSERS_PATH
# at runtime and launches it via `launchOptions.executablePath`, so it is
# resilient to revision-folder drift.
#
# Gated to dev mode: e2e is a debugging tool, no reason to ship a browser in a
# production image.
#
# VERSION ALIGNMENT: keep `@playwright/test` in frontend/package.json in step
# with this Nix package (the npm client drives the Nix-built browser). Check the
# Nix side with:  nix eval --raw nixpkgs#playwright-driver.version

{ config, lib, pkgs, ... }:

let
  isDev = config.playcode.services.mode == "dev";
  # chromium only - see header. browsers-chromium is a passthru of the
  # nixpkgs playwright-driver package.
  chromium = pkgs.playwright-driver.browsers-chromium;
in
lib.mkIf isDev {
  environment.systemPackages = [ chromium ];

  environment.sessionVariables = {
    # Where playwright.config.ts globs for the chromium binary.
    PLAYWRIGHT_BROWSERS_PATH = "${chromium}";
    # The Nix package is the only browser source on NixOS - never let
    # `pnpm install` / `playwright install` fetch its own (FHS-only) build.
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
    # NixOS is not a recognised distro; skip the apt-style host-dependency
    # probe that would otherwise abort the run before the browser starts.
    PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "true";
    # Treat this as a known platform rather than "unknown linux".
    PLAYWRIGHT_HOST_PLATFORM_OVERRIDE = "ubuntu-24.04";
  };
}
