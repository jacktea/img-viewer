# @jacktea/img-viewer-react

**项目预览：[https://imgviewer.851621.xyz](https://imgviewer.851621.xyz)**

基于 `@jacktea/img-viewer` 封装的 React 版本图片预览器组件。

## 安装

```bash
npm install @jacktea/img-viewer-react @jacktea/img-viewer
# 或者
pnpm add @jacktea/img-viewer-react @jacktea/img-viewer
# 或者
yarn add @jacktea/img-viewer-react @jacktea/img-viewer
```

> **注意：** 该包依赖于核心包 `@jacktea/img-viewer`，请确保同时安装。
>
> 核心包已通过 Web Components 内部注入的方式集成了所有样式，因此您 **不需要单独引入任何 CSS** 文件。

## 使用组件

```tsx
import { ReactNode } from 'react';
import { ImgViewerReact } from '@jacktea/img-viewer-react';

function App() {
  return (
    <div style={{ padding: 20 }}>
      <h1>图片预览演示</h1>
      <ImgViewerReact
        src="https://example.com/path/to/your/image.jpg"
        style={{ width: '800px', height: '600px', border: '1px solid #ccc' }}
      />
    </div>
  );
}

export default App;
```

## Props 说明

支持所有标准的 HTML 属性（例如 `style`, `className` 等）以及：

| Prop | 类型 | 描述 |
| :--- | :--- | :--- |
| `src` | `string` (必须) | 想要预览的图片 URL |
| `style` | `React.CSSProperties` | 内联样式，建议至少设定 width 和 height |

## 许可证

MIT
