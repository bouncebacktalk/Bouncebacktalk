# Boot + system module for the project VM.
#
# When `nixos-rebuild switch` evaluates this flake, it does so as a
# STANDALONE nixosSystem — it doesn't merge with the base image's config.
# So this module has to re-assert the system-level invariants: container
# boot model, app user, sshd, base utilities. Without this, nixos-rebuild
# fails on missing fileSystems / bootloader options.

{ config, lib, pkgs, ... }:

{
  # ── Boot model: container, no bootloader/kernel/initrd ──────────────────
  boot.isContainer = true;

  # /etc/resolv.conf is written at boot by the VM host; systemd-resolved
  # would otherwise overwrite it.
  services.resolved.enable = false;

  networking.useDHCP = false;

  # Disabled — the VM kernel doesn't support nftables, so NixOS's
  # firewall.service would crash every rebuild. Network isolation is
  # enforced at the host level outside the VM.
  networking.firewall.enable = false;

  systemd.settings.Manager.DefaultTimeoutStopSec = "5s";

  # ── Base utilities ─────────────────────────────────────────────────────
  # `e2fsprogs` provides `chattr` (FS_IOC_SETFLAGS frontend). sky-init and
  # sky-guest now drive the ioctl directly (see sky-{init,guest}/src/fs_attr.rs),
  # but having `chattr` on PATH is still useful for operator debugging when
  # SSH'd in. The 2026-05-18 host3 incident traced to its absence:
  # without `chattr`, the previous shell-out swap path silently no-op'd
  # the +i clear and `rename(live, prev)` failed fleet-wide with EPERM.
  environment.systemPackages = with pkgs; [
    bash
    coreutils
    util-linux
    e2fsprogs
    sudo
    cacert
    curl
    openssh
  ];

  # ── User account: app at uid 1000, sudo without password ────────────────
  # Private `app` group (gid 1000) so /srv/workspace ends up `app:app`, not
  # `app:users`. Layered ownership: root/system owns NixOS config + systemd
  # units; app:app owns /srv/workspace; service processes run as app.
  users.groups.app = {
    gid = 1000;
  };
  users.users.app = {
    isNormalUser = true;
    uid = 1000;
    group = "app";
    home = "/home/app";
    shell = pkgs.bash;
    extraGroups = [ "wheel" ];
    # Single-tenant VM — SSH key auth only; no password is set.
    initialPassword = "";
  };
  security.sudo.wheelNeedsPassword = false;

  environment.etc."skel/.bashrc".text = ''
    [ -d /workspace ] && cd /workspace
  '';

  # ── SSH ────────────────────────────────────────────────────────────────
  services.openssh = {
    enable = true;
    settings.PasswordAuthentication = false;
    settings.PermitRootLogin = "prohibit-password";
  };

  # System-wide git safe.directory. Editor tooling runs commands as root
  # but the workspace at /srv/workspace is owned by app:app. Without this,
  # `git status` from the editor dies with "dubious ownership". This is a
  # single-tenant VM with no adversarial git contexts.
  programs.git.enable = true;
  programs.git.config = {
    safe.directory = "*";
  };

  # No swap — the rootfs is small.
  swapDevices = lib.mkForce [];
}
