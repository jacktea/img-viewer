#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$SCRIPT_DIR/build-libtiff.sh"
"$SCRIPT_DIR/build-libraw.sh"
"$SCRIPT_DIR/build-libheif.sh"

echo "all wasm builds finished"
