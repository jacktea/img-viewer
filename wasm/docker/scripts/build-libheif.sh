#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/common.sh"

LIBDE265_ARCHIVE="$SOURCE_ROOT/libde265-$LIBDE265_VERSION.tar.gz"
LIBDE265_SRC="$SOURCE_ROOT/libde265-$LIBDE265_VERSION"
LIBHEIF_ARCHIVE="$SOURCE_ROOT/libheif-$LIBHEIF_VERSION.tar.gz"
LIBHEIF_SRC="$SOURCE_ROOT/libheif-$LIBHEIF_VERSION"

download_if_missing \
  "https://github.com/strukturag/libde265/releases/download/v$LIBDE265_VERSION/libde265-$LIBDE265_VERSION.tar.gz" \
  "$LIBDE265_ARCHIVE"
extract_archive "$LIBDE265_ARCHIVE" "$LIBDE265_SRC" "$LIBDE265_SRC/configure"

pushd "$LIBDE265_SRC" >/dev/null
ac_cv_search_pthread_create=no emconfigure ./configure \
  --host=none \
  --prefix="$WASM_PREFIX" \
  --disable-shared \
  --enable-static \
  --disable-dec265 \
  --disable-sherlock265 \
  --disable-encoder
emmake make -j"$JOBS"
emmake make install
popd >/dev/null

if ! pkg-config --exists libde265; then
  log "libde265 pkg-config not found after install"
  exit 1
fi

download_if_missing \
  "https://github.com/strukturag/libheif/releases/download/v$LIBHEIF_VERSION/libheif-$LIBHEIF_VERSION.tar.gz" \
  "$LIBHEIF_ARCHIVE"
extract_archive "$LIBHEIF_ARCHIVE" "$LIBHEIF_SRC" "$LIBHEIF_SRC/CMakeLists.txt"

ensure_clean_build_dir "libheif"
LIBHEIF_BUILD="$BUILD_ROOT/libheif"
pushd "$LIBHEIF_SRC" >/dev/null
emcmake cmake -S . -B "$LIBHEIF_BUILD" -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_INSTALL_PREFIX="$WASM_PREFIX" \
  -DCMAKE_PREFIX_PATH="$WASM_PREFIX" \
  -DCMAKE_C_FLAGS="-D__EMSCRIPTEN_STANDALONE_WASM__" \
  -DCMAKE_CXX_FLAGS="-D__EMSCRIPTEN_STANDALONE_WASM__ -fexceptions" \
  -DBUILD_SHARED_LIBS=OFF \
  -DBUILD_TESTING=OFF \
  -DENABLE_PLUGIN_LOADING=OFF \
  -DWITH_EXAMPLES=OFF \
  -DWITH_GDK_PIXBUF=OFF \
  -DWITH_X265=OFF \
  -DWITH_LIBDE265_PLUGIN=OFF \
  -DWITH_LIBDE265=ON \
  -DLIBDE265_INCLUDE_DIR="/opt/wasm/include" \
  -DLIBDE265_LIBRARY="/opt/wasm/lib/libde265.a" \
  -DLIBDE265_INCLUDE_DIRS="/opt/wasm/include" \
  -DLIBDE265_LIBRARIES="/opt/wasm/lib/libde265.a" \
  -DWITH_AOM_DECODER=OFF \
  -DWITH_AOM_ENCODER=OFF \
  -DWITH_DAV1D=OFF \
  -DWITH_RAV1E=OFF \
  -DWITH_SvtEnc=OFF \
  -DENABLE_MULTITHREADING_SUPPORT=OFF \
  -DENABLE_PARALLEL_TILE_DECODING=OFF \
  -DWITH_OpenJPEG_DECODER=OFF \
  -DWITH_OpenJPEG_ENCODER=OFF
cmake --build "$LIBHEIF_BUILD" -j"$JOBS"
cmake --install "$LIBHEIF_BUILD"
popd >/dev/null

OUT_DIR="$OUTPUT_DIR/libheif"
mkdir -p "$OUT_DIR"

EM_OPT_LEVEL="${EM_OPT_LEVEL:--O3}"

EM_FLAGS=(
  "$EM_OPT_LEVEL"
  -fexceptions
  -s MODULARIZE=1
  -s EXPORT_ES6=1
  -s ALLOW_MEMORY_GROWTH=1
  -s DISABLE_EXCEPTION_CATCHING=0
  -s STACK_SIZE=5242880
  -s FORCE_FILESYSTEM=1
  -s ENVIRONMENT=web,worker
  -s EXPORTED_FUNCTIONS='["_malloc","_free","_jt_heif_decode_rgba","_jt_heif_decode_rgba_mem","_jt_heif_decode_rgba16","_jt_heif_decode_rgba16_mem","_jt_heif_free","_jt_heif_last_error"]'
  -s EXPORTED_RUNTIME_METHODS='["FS","cwrap","UTF8ToString","stringToUTF8","lengthBytesUTF8","getValue","setValue"]'
)
if [[ "${WASM_SINGLE_FILE:-0}" == "1" ]]; then
  EM_FLAGS+=(-s SINGLE_FILE=1)
fi
if [[ "${WASM_SIMD:-0}" == "1" ]]; then
  EM_FLAGS+=(-msimd128)
fi

em++ -x c++ "$DOCKER_ROOT/wrappers/libheif_wrapper.c" \
  -I"$WASM_PREFIX/include" \
  -L"$WASM_PREFIX/lib" \
  -lheif -lde265 \
  "${EM_FLAGS[@]}" \
  -o "$OUT_DIR/libheif.js"

log "libheif wasm output: $OUT_DIR"
