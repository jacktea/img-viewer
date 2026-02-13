# img-viewer wasm build

`img-viewer` 已内置三方解码 wasm 的 Docker 构建链（`libheif` / `libtiff` / `libraw`）。

## 快速使用

在仓库根目录执行：

```bash
pnpm build:wasm
```

该命令会：

1. 使用 `wasm/docker/Dockerfile` 构建统一 Emscripten 环境。
2. 编译三个库的 `js + wasm`。
3. 产物直接输出到 `packages/core/src/wasm`。

随后构建 core：

```bash
pnpm build:core
```

或一键闭环：

```bash
pnpm build:core:full
```

## 单库构建

```bash
pnpm build:wasm:libheif
pnpm build:wasm:libtiff
pnpm build:wasm:libraw
```

## 说明

- 默认是分离模式（`libxxx.js + libxxx.wasm`）。
- 可通过环境变量开启单文件模式：

```bash
WASM_SINGLE_FILE=1 pnpm build:wasm
```

- 构建缓存位于 `wasm/docker/sources`（已通过 `.gitignore` 忽略）。
