#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/common.sh"

LIBRAW_ARCHIVE="$SOURCE_ROOT/LibRaw-$LIBRAW_VERSION.tar.gz"
LIBRAW_SRC="$SOURCE_ROOT/libraw-$LIBRAW_VERSION"

download_if_missing "https://www.libraw.org/data/LibRaw-$LIBRAW_VERSION.tar.gz" "$LIBRAW_ARCHIVE"
extract_archive "$LIBRAW_ARCHIVE" "$LIBRAW_SRC" "$LIBRAW_SRC/configure"

pushd "$LIBRAW_SRC" >/dev/null
emconfigure ./configure \
  --host=none \
  --prefix="$WASM_PREFIX" \
  --disable-shared \
  --enable-static \
  --disable-openmp \
  --disable-examples \
  --disable-lcms
emmake make -j"$JOBS"
emmake make install
popd >/dev/null

OUT_DIR="$OUTPUT_DIR/libraw"
mkdir -p "$OUT_DIR"

EM_OPT_LEVEL="${EM_OPT_LEVEL:--O3}"

EM_FLAGS=(
  "$EM_OPT_LEVEL"
  -s MODULARIZE=1
  -s EXPORT_ES6=1
  -s ALLOW_MEMORY_GROWTH=1
  -s FORCE_FILESYSTEM=1
  -s ENVIRONMENT=web,worker
  -s EXPORTED_FUNCTIONS='["_malloc","_free","_jt_raw_decode_rgba","_jt_raw_decode_rgba16","_jt_raw_free","_jt_raw_last_error"]'
  -s EXPORTED_RUNTIME_METHODS='["FS","cwrap","UTF8ToString","stringToUTF8","lengthBytesUTF8","getValue","setValue"]'
)
if [[ "${WASM_SINGLE_FILE:-0}" == "1" ]]; then
  EM_FLAGS+=(-s SINGLE_FILE=1)
fi
if [[ "${WASM_SIMD:-0}" == "1" ]]; then
  EM_FLAGS+=(-msimd128)
fi

em++ "$DOCKER_ROOT/wrappers/libraw_wrapper.cpp" \
  -I"$WASM_PREFIX/include" \
  -L"$WASM_PREFIX/lib" \
  -lraw \
  "${EM_FLAGS[@]}" \
  -o "$OUT_DIR/libraw.js"

log "libraw wasm output: $OUT_DIR"
