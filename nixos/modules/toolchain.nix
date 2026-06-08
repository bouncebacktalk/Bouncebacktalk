# Toolchain — everything available on PATH inside the VM.
#
# Adds:
#   JS toolchain         nodejs_22, pnpm
#   Search / edit        ripgrep, fd, vim, tree, htop, unzip
#   Network tooling      iputils, iproute2, inetutils, dnsutils, wget
#   Prisma engines       compiled binaries — see comment in the list
#   nix-ld libraries     so prebuilt binaries pnpm downloads at install time
#                        (esbuild, swc, sharp, @rollup/rollup-*) work on NixOS
#
# To add a package, append it to systemPackages and run `nixos-rebuild switch`.

{ config, lib, pkgs, ... }:

{
  environment.systemPackages = with pkgs; [
    # JS toolchain
    nodejs_22
    pnpm
    # Filesystem / search
    ripgrep
    fd
    tree
    htop
    vim
    unzip
    # Network tooling
    iputils
    iproute2
    inetutils
    dnsutils
    wget
    # Prisma schema engine via nixpkgs. The CLI still comes from npm
    # (`pnpm prisma`), but migrate/generate use this Nix store binary
    # instead of Prisma's auto-detected linux-nixos download path.
    prisma-engines
  ];
  environment.sessionVariables = {
    PKG_CONFIG_PATH = "${pkgs.openssl.dev}/lib/pkgconfig";
    PRISMA_SCHEMA_ENGINE_BINARY = "${pkgs.prisma-engines}/bin/schema-engine";
    PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING = "1";
  };

  # nix-ld: Linux binaries downloaded by pnpm (esbuild, swc, sharp, etc.)
  # link against /lib64/ld-linux-x86-64.so.2 which doesn't exist on
  # NixOS (no FHS). nix-ld provides a shim ld-linux that finds libs in
  # the libraries list below. Without this, every modern JS template
  # breaks the moment `pnpm install` finishes downloading a native dep.
  programs.nix-ld.enable = true;
  programs.nix-ld.libraries = with pkgs; [
    stdenv.cc.cc.lib
    zlib
    openssl
    libuv
    icu
    glib
    nss
    nspr
    libxkbcommon
    sqlite
    expat
    libgcc
    bzip2
    xz
  ];
}
