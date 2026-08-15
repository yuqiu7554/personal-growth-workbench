#!/bin/sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cargo_bin=${CARGO_BIN:-$(command -v cargo 2>/dev/null || printf '%s/.cargo/bin/cargo' "$HOME")}

if [ ! -x "$cargo_bin" ]; then
  echo "Cargo not found: $cargo_bin" >&2
  exit 1
fi

echo "Workspace sizes before build:"
du -sh "$project_dir/workbench-prototype" "$project_dir/src-tauri"

echo "Checking Tauri dependencies without network access..."
(cd "$project_dir/src-tauri" && "$cargo_bin" check --offline)

echo "Native preflight passed. No release bundle was created."
