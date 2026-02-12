{
  description = "A Nix-flake-based Node.js development environment";

  inputs.nixpkgs.url = "https://flakehub.com/f/NixOS/nixpkgs/0.1.*.tar.gz";

  outputs = {
    self,
    nixpkgs,
  }: let
    supportedSystems = ["x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin"];
    forEachSupportedSystem = f:
      nixpkgs.lib.genAttrs supportedSystems (system:
        f {
          pkgs = import nixpkgs {
            inherit system;
            overlays = [self.overlays.default];
          };
        });
  in {
    overlays.default = final: prev: rec {
      nodejs = prev.nodejs;
      yarn = prev.yarn.override {inherit nodejs;};
    };

    devShells = forEachSupportedSystem ({pkgs}: {
      default = pkgs.mkShell {
        packages = with pkgs; [node2nix nodejs nodePackages.pnpm yarn uv ]; # Added uv so we can use spec-kit
      };
    });
    postShellHook = ''
      KERNEL_NAME="jl-313"
      KERNEL_DIR="$HOME/.local/share/jupyter/kernels/$KERNEL_NAME"
      if [ ! -d "$KERNEL_DIR" ]; then
        python -m ipykernel install --user \
          --name "$KERNEL_NAME" \
          --display-name "Python 3.13 (flake)" >/dev/null
      fi
    '';
  };
}
