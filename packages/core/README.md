# @jacktea/img-viewer

**项目预览：[https://imgviewer.851621.xyz](https://imgviewer.851621.xyz)**

一款由于 Vue/React 等框架解耦的、无依赖的纯前端图片在线预览器，支持诸如缩放、平移等功能。

## 安装

```bash
npm install @jacktea/img-viewer
# 或者
pnpm add @jacktea/img-viewer
# 或者
yarn add @jacktea/img-viewer
```

## 使用

这是一个基于 Web Components 构建的原生组件，你可以直接在 HTML 当中使用它。

直接引入脚本即可：

```html
<script type="module">
  import '@jacktea/img-viewer';
</script>
```

然后在你的页面中使用 `img-viewer` 组件：

```html
<img-viewer src="path/to/your/image.jpg" width="800px" height="600px"></img-viewer>
```

### 属性 (Attributes)

*   `src`: 图片的 URL，支持普通图片，也支持某些特殊格式如并行的 PSD 解析（需要引入对应解析库）。
*   `width`: 预览器容器的宽度。
*   `height`: 预览器容器的高度。

## 许可证

MIT
