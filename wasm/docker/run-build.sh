#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

TARGET="${1:-all}"
OUTPUT_PATH="${2:-$REPO_ROOT/packages/core/src/wasm}"
IMAGE_NAME="${IMAGE_NAME:-jt-wasm-builder:latest}"
WASM_SINGLE_FILE="${WASM_SINGLE_FILE:-0}"
WASM_SIMD="${WASM_SIMD:-0}"
EM_OPT_LEVEL="${EM_OPT_LEVEL:--O3}"

case "$TARGET" in
all|libtiff|libraw|libheif)
  ;;
*)
  echo "Usage: $0 [all|libtiff|libraw|libheif] [output-path]"
  exit 1
  ;;
esac

if [[ "$OUTPUT_PATH" != /* ]]; then
  OUTPUT_PATH="$REPO_ROOT/$OUTPUT_PATH"
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found"
  exit 1
fi

mkdir -p "$OUTPUT_PATH"

docker build -f "$SCRIPT_DIR/Dockerfile" -t "$IMAGE_NAME" "$SCRIPT_DIR"

docker run --rm \
  -e OUTPUT_DIR=/out \
  -e WASM_SINGLE_FILE="$WASM_SINGLE_FILE" \
  -e WASM_SIMD="$WASM_SIMD" \
  -e EM_OPT_LEVEL="$EM_OPT_LEVEL" \
  -v "$REPO_ROOT":/work \
  -v "$OUTPUT_PATH":/out \
  "$IMAGE_NAME" \
  bash -lc "/work/wasm/docker/scripts/build-$TARGET.sh"

echo "done. outputs: $OUTPUT_PATH"
