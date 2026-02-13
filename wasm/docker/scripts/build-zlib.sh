#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/common.sh"

ZLIB_ARCHIVE="$SOURCE_ROOT/zlib-$ZLIB_VERSION.tar.gz"
ZLIB_SRC="$SOURCE_ROOT/zlib-$ZLIB_VERSION"

download_if_missing "https://zlib.net/zlib-$ZLIB_VERSION.tar.gz" "$ZLIB_ARCHIVE"
extract_archive "$ZLIB_ARCHIVE" "$ZLIB_SRC" "$ZLIB_SRC/configure"

ensure_clean_build_dir "zlib"
pushd "$ZLIB_SRC" >/dev/null
emconfigure ./configure --static --prefix="$WASM_PREFIX"
emmake make -j"$JOBS"
emmake make install
popd >/dev/null

log "zlib built to $WASM_PREFIX"
