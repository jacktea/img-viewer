# @jacktea/img-viewer-vue

基于 `@jacktea/img-viewer` 封装的 Vue 3 图片预览组件。

## 安装

```bash
npm install @jacktea/img-viewer-vue @jacktea/img-viewer
# 或者
pnpm add @jacktea/img-viewer-vue @jacktea/img-viewer
# 或者
yarn add @jacktea/img-viewer-vue @jacktea/img-viewer
```

> **注意：** 该包依赖于核心包 `@jacktea/img-viewer`，请确保同时安装。
>
> 核心包已通过 Web Components 内部注入的方式集成了所有样式，因此您 **不需要单独引入任何 CSS** 文件。

## 注册与使用

在你的入口文件（例如 `main.ts`）引入组件，或直接在想要使用的文件中按需引入即可。

```typescript
import { createApp } from 'vue';
import App from './App.vue';

// 核心组件本身在首次导入时会注册 Web Component 并自动注入所需样式
const app = createApp(App);
app.mount('#app');
```

## 局部使用

```vue
<template>
  <div>
    <h1>图片预览演示</h1>
    <ImgViewerVue
      src="https://example.com/path/to/your/image.jpg"
      class="my-viewer"
    />
  </div>
</template>

<script setup lang="ts">
import { ImgViewerVue } from '@jacktea/img-viewer-vue';
</script>

<style scoped>
.my-viewer {
  width: 800px;
  height: 600px;
  border: 1px solid #ccc;
}
</style>
```

## Props 属性

| Prop | 类型 | 描述 |
| :--- | :--- | :--- |
| `src` | `string` (必须) | 想要预览的图片 URL |

支持传入 `class`, `style` 等常规 Vue 熟悉绑定。

## 许可证

MIT
