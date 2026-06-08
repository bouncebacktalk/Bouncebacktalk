# NixOS flake for Warm Template.
#
# Layout: this flake lives inside `nixos/` (not at the workspace root)
# so Nix's source-tree copy is scoped to just the NixOS config (~50 KB),
# not the whole workspace. Every `nixos-rebuild` evaluation copies the
# flake's source set into /nix/store; keeping it small cuts eval time.
#
# # Three outputs (`.#default`, `.#dev`, `.#prod`)
#
# All three share the same `configuration.nix` + `project.nix` module
# graph; the only difference is the value of `playcode.services.mode`:
#
#   .#default → mode = whatever project.nix sets (today: "dev")
#   .#dev     → mode = "dev"  (forced; ignores project.nix)
#   .#prod    → mode = "prod" (forced; ignores project.nix)
#
# `.#default` is what you run interactively (`sudo nixos-rebuild switch
# --flake /workspace/nixos#default --fast`). `.#prod` is what `deploy.sh`
# runs to flip services into production mode at deploy time without
# editing `project.nix`.
#
# Force-override mechanism: `lib.mkForce` beats the default priority
# project.nix uses, so the wrapper module wins without touching the
# user's file.

{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";

      # Builder: shared module graph, optional mode override module.
      # When `forcedMode` is null the user's `project.nix` value wins
      # (`.#default`). Otherwise the override takes precedence via
      # `lib.mkForce`.
      mkConfig = forcedMode: nixpkgs.lib.nixosSystem {
        inherit system;
        modules = [
          ./configuration.nix
        ] ++ nixpkgs.lib.optional (forcedMode != null) (
          { lib, ... }: {
            playcode.services.mode = lib.mkForce forcedMode;
          }
        );
      };
    in {
      nixosConfigurations = {
        default = mkConfig null;
        dev     = mkConfig "dev";
        prod    = mkConfig "prod";
      };
    };
}
