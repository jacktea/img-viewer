#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$DOCKER_ROOT/../.." && pwd)"

# shellcheck source=/dev/null
source "$DOCKER_ROOT/toolchains/versions.env"

JOBS="${JOBS:-$(nproc)}"
WASM_PREFIX="${WASM_PREFIX:-/opt/wasm}"
SOURCE_ROOT="${SOURCE_ROOT:-$DOCKER_ROOT/sources}"
BUILD_ROOT="${BUILD_ROOT:-/tmp/wasm-build}"
ARTIFACT_ROOT="${ARTIFACT_ROOT:-$DOCKER_ROOT/artifacts}"
OUTPUT_DIR="${OUTPUT_DIR:-$ARTIFACT_ROOT}"

mkdir -p "$SOURCE_ROOT" "$BUILD_ROOT" "$ARTIFACT_ROOT" "$OUTPUT_DIR"

log() {
  printf '[wasm-build] %s\n' "$*"
}

download_if_missing() {
  local url="$1"
  local out_file="$2"

  if [[ -f "$out_file" ]]; then
    log "use cache: $out_file"
    return 0
  fi

  log "download: $url"
  curl -fL --retry 3 --retry-delay 2 "$url" -o "$out_file"
}

extract_archive() {
  local archive_file="$1"
  local dest_dir="$2"
  local marker="$3"

  if [[ -f "$marker" ]]; then
    log "extract skip: $marker exists"
    return 0
  fi

  rm -rf "$dest_dir"
  mkdir -p "$dest_dir"
  tar -xf "$archive_file" -C "$dest_dir" --strip-components=1
}

ensure_clean_build_dir() {
  local name="$1"
  rm -rf "$BUILD_ROOT/$name"
  mkdir -p "$BUILD_ROOT/$name"
}
