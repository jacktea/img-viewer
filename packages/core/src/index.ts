/**
 * @jacktea/img-viewer - 图片预览组件
 * 
 * 支持多种预览模式，本地/远程文件加载，格式自动转换
 */

export { ImgViewerElement } from './img-viewer';
export {
  configureNativeWasm,
  getNativeWasmOptions,
  resetNativeWasmOptions,
  type NativeWasmCodec,
  type NativeWasmOptions,
} from './core/native-wasm-codecs';
export type {
  ImageSource,
  ViewMode,
  ViewerConfig,
  TransformState,
  MagnifierConfig,
  LoadedImage,
  LoadingState,
  ViewerEventMap,
  ToolbarConfig,
  ToolbarItem,
  ToolbarPosition,
  ToolbarMode,
  DecoderType,
  DecoderConfig,
} from './types';
export { DEFAULT_CONFIG, DEFAULT_TRANSFORM, NATIVE_IMAGE_TYPES } from './types';

// 主题
export type { ThemeName } from './types';

// 国际化
export type { I18nMessages, LocaleName } from './i18n';
export { getMessages, registerLocale } from './i18n';

// 自动注册自定义元素
import { ImgViewerElement } from './img-viewer';

if (!customElements.get('img-viewer')) {
  customElements.define('img-viewer', ImgViewerElement);
}

/**
 * 手动注册自定义元素（使用自定义标签名）
 */
export function defineImgViewer(tagName: string = 'img-viewer'): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, class extends ImgViewerElement {});
  }
}

// 声明全局类型
declare global {
  interface HTMLElementTagNameMap {
    'img-viewer': ImgViewerElement;
  }
}
