# Docker wasm build (macOS)

用于在 macOS 上通过 Docker + Emscripten 编译 `libtiff` / `LibRaw` / `libheif`，并产出可在前端调用的 `js + wasm` 模块。

## 目录说明

- `Dockerfile`: 统一编译环境
- `run-build.sh`: 主入口（宿主机执行）
- `scripts/build-libtiff.sh`: 编译 libtiff + wrapper
- `scripts/build-libraw.sh`: 编译 LibRaw + wrapper
- `scripts/build-libheif.sh`: 编译 libde265 + libheif + wrapper
- `wrappers/*`: 统一导出接口（C/C++）

## 一键构建

默认输出到 `img-viewer core` 内部目录 `packages/core/src/wasm`：

```bash
cd /Users/xiaogang/github/jacktea/img-viewer
./wasm/docker/run-build.sh all
```

单库构建：

```bash
./wasm/docker/run-build.sh libtiff
./wasm/docker/run-build.sh libraw
./wasm/docker/run-build.sh libheif
```

单文件模式（把 wasm 内联进 js，不再单独产出 `.wasm`）：

```bash
WASM_SINGLE_FILE=1 ./wasm/docker/run-build.sh all
```

SIMD 与优化级别（可选）：

```bash
WASM_SIMD=1 EM_OPT_LEVEL=-O3 ./wasm/docker/run-build.sh all
```

指定输出目录（相对路径按仓库根目录解析）：

```bash
./wasm/docker/run-build.sh all packages/core/src/wasm/custom
```

## 导出函数

### libtiff

- `_jt_tiff_decode_rgba(pathPtr, outBufPtrPtr, outWPtr, outHPtr) -> int`
- `_jt_tiff_decode_rgba16(pathPtr, outBufPtrPtr, outWPtr, outHPtr, outBitDepthPtr) -> int`
- `_jt_tiff_last_error() -> const char*`
- `_jt_tiff_free(ptr)`

### libraw

- `_jt_raw_decode_rgba(pathPtr, outBufPtrPtr, outWPtr, outHPtr) -> int`
- `_jt_raw_decode_rgba16(pathPtr, outBufPtrPtr, outWPtr, outHPtr, outBitDepthPtr) -> int`
- `_jt_raw_last_error() -> const char*`
- `_jt_raw_free(ptr)`

### libheif

- `_jt_heif_decode_rgba(pathPtr, outBufPtrPtr, outWPtr, outHPtr) -> int`
- `_jt_heif_decode_rgba_mem(dataPtr, dataLen, outBufPtrPtr, outWPtr, outHPtr) -> int`
- `_jt_heif_decode_rgba16(pathPtr, outBufPtrPtr, outWPtr, outHPtr, outBitDepthPtr) -> int`
- `_jt_heif_decode_rgba16_mem(dataPtr, dataLen, outBufPtrPtr, outWPtr, outHPtr, outBitDepthPtr) -> int`
- `_jt_heif_last_error() -> const char*`
- `_jt_heif_free(ptr)`

返回值 `0` 表示成功，非 `0` 失败；失败时读取 `*_last_error()`。

## 对接 img-viewer

推荐将产物输出到 `core` 包内部资源目录（由 `core` 统一 import `?url`）：

```bash
./wasm/docker/run-build.sh all packages/core/src/wasm
```

这样 `playground`、`tauri` 等客户端只要依赖 `@jacktea/img-viewer`，构建时会自动把 `js+wasm` 打进客户端产物（通常落到 `dist/assets/*`），不需要手动复制到 `public`。

仅在你明确想走外部静态资源（CDN 或自定义路径）时，再用 `baseUrl` 覆盖：

```ts
import { configureNativeWasm } from '@jacktea/img-viewer';

configureNativeWasm({
  enabled: true,
  baseUrl: '/wasm', // 可选：外部资源模式
  preferNative: true,
});
```
