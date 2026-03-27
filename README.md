# img-viewer

**项目预览：[https://imgviewer.851621.xyz](https://imgviewer.851621.xyz)**

`img-viewer` 是一个面向浏览器的图片预览组件库，提供：

- 原生 Web Component：`@jacktea/img-viewer`
- Vue 封装：`@jacktea/img-viewer-vue`
- React 封装：`@jacktea/img-viewer-react`

支持单图、轮播、幻灯片、相册四种模式，支持拖拽/文件选择器，支持 HEIF/TIFF/RAW/PSD 等格式转换预览（基于内置 wasm 解码链与 PSD 解析）。

## 特性

- 多预览模式：`single` / `carousel` / `slideshow` / `gallery`
- 多输入源：本地 `File`、远程 URL、Base64
- 解码链路：
  - 浏览器原生格式直接显示（jpeg/png/webp/avif 等）
  - HEIF/TIFF/RAW 走内置 wasm 解码并转换为可显示格式
  - PSD 走 `@webtoon/psd` 转换
- 内置工具栏：旋转、翻转、缩放、全屏、下载、信息面板、模式切换
- 国际化：内置 `zh-CN` / `en`，支持自定义语言包
- 框架无关 + Vue/React 封装可选

## 安装

按实际使用选择：

```bash
pnpm add @jacktea/img-viewer
```

```bash
pnpm add @jacktea/img-viewer-vue
```

```bash
pnpm add @jacktea/img-viewer-react
```

## 快速开始

### 1) 原生 Web Component

```ts
import '@jacktea/img-viewer';
import type { ImgViewerElement, ImageSource } from '@jacktea/img-viewer';

const viewer = document.querySelector('img-viewer') as ImgViewerElement;

const sources: ImageSource[] = [
  { type: 'url', data: 'https://picsum.photos/1200/800?random=1', name: 'remote.jpg' },
];

await viewer.open(sources);
viewer.setMode('single');
```

```html
<img-viewer mode="single" theme="dark"></img-viewer>
```

### 2) Vue

```vue
<template>
  <ImgViewer
    ref="viewer"
    :sources="sources"
    mode="single"
    :readonly="false"
    :decode-type="'auto'"
    :decode-fallback="true"
    @image-load="onLoad"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ImgViewer } from '@jacktea/img-viewer-vue';
import type { ImageSource } from '@jacktea/img-viewer';

const viewer = ref<InstanceType<typeof ImgViewer>>();
const sources = ref<ImageSource[]>([
  { type: 'url', data: 'https://picsum.photos/1200/800?random=2' },
]);

const onLoad = (detail: { index: number }) => {
  console.log('loaded', detail.index);
};
</script>
```

### 3) React

```tsx
import { useRef } from 'react';
import { ImgViewer, type ImgViewerRef } from '@jacktea/img-viewer-react';
import type { ImageSource } from '@jacktea/img-viewer';

export function Demo() {
  const ref = useRef<ImgViewerRef>(null);
  const sources: ImageSource[] = [
    { type: 'url', data: 'https://picsum.photos/1200/800?random=3' },
  ];

  return (
    <ImgViewer
      ref={ref}
      sources={sources}
      mode="single"
      onImageLoad={(d) => console.log(d.index)}
    />
  );
}
```

## 输入源格式

`ImageSource`：

```ts
type ImageSource =
  | { type: 'file'; data: File; name?: string; mimeType?: string }
  | { type: 'url'; data: string; name?: string; mimeType?: string }
  | { type: 'base64'; data: string; name?: string; mimeType?: string };
```

## Web Component API

### Attributes / Properties

- `mode`: `single | carousel | slideshow | gallery`
- `readonly`: 布尔属性
- `auto-play`: 布尔属性
- `interval`: 自动播放间隔（ms）
- `theme`: `dark | light | auto`
- `locale`: `zh-CN | en | 自定义`
- `decode-type`: `auto | rgba8 | rgba16`
- `decode-fallback`: `true | false`（`rgba16` 失败时是否回退）
- `src`: 支持 URL 字符串或 JSON 字符串数组

### Methods

- `open(sources: ImageSource | ImageSource[]): Promise<void>`
- `openFileDialog(): void`
- `setMode(mode): void`
- `setTheme(theme): void`
- `setLocale(locale): void`
- `setConfig(config: Partial<ViewerConfig>): void`
- `getConfig(): ViewerConfig`
- `getImages(): LoadedImage[]`
- `downloadCurrent(): void`
- `destroy(): void`

### Events

- `image-load`: `{ index, image }`
- `image-error`: `{ index, error }`
- `image-change`: `{ index, image }`
- `mode-change`: `{ mode }`
- `transform-change`: `{ transform }`

## wasm 解码配置

你可以在运行时控制 HEIF/TIFF/RAW 的 wasm 解码行为：

```ts
import { configureNativeWasm } from '@jacktea/img-viewer';

configureNativeWasm({
  enabled: true,
  preferNative: true,
  baseUrl: '', // 为空时使用内置打包资源；填 '/wasm' 可改为外部静态资源
  codecs: ['heif', 'tiff', 'raw'],
});
```

可用 API：

- `configureNativeWasm(options)`
- `getNativeWasmOptions()`
- `resetNativeWasmOptions()`

## 开发

### 环境要求

- Node.js >= 18
- pnpm >= 9

### 安装依赖

```bash
pnpm install
```

### 本地开发（playground）

```bash
pnpm dev
```

### 构建

```bash
pnpm build
```

分别构建：

```bash
pnpm build:core
pnpm build:vue
pnpm build:react
```

### 构建 wasm 解码产物

```bash
pnpm build:wasm
```

单库构建：

```bash
pnpm build:wasm:libheif
pnpm build:wasm:libtiff
pnpm build:wasm:libraw
```

更多 wasm 细节见：

- `wasm/README.md`
- `wasm/docker/README.md`

## 仓库结构

```text
packages/core   -> Web Component 核心包 @jacktea/img-viewer
packages/vue    -> Vue 封装 @jacktea/img-viewer-vue
packages/react  -> React 封装 @jacktea/img-viewer-react
playground      -> 演示与调试入口
wasm            -> wasm 解码构建链（libheif/libtiff/libraw）
apps/desktop    -> Tauri 桌面端示例
```

## License

- 本项目自有代码：MIT（见 `LICENSE`）
- 三方解码组件许可证：见 `THIRD_PARTY_NOTICES.md` 与 `third_party/licenses/*`

注意：发布包含 wasm 解码产物的二进制/前端资源时，请同时分发三方许可证文本并遵守对应条款（尤其 LGPL/CDDL 相关要求）。
