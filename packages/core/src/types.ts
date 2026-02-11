/**
 * @jacktea/img-viewer - 图片预览组件类型定义
 */

import type { ThemeName } from './themes';
import type { LocaleName } from './i18n';

/** 图片来源 */
export interface ImageSource {
  /** 来源类型 */
  type: 'file' | 'url' | 'base64';
  /** 
   * 数据：
   * - file: File 对象
   * - url: 图片 URL 字符串
   * - base64: base64 编码字符串
   */
  data: File | string;
  /** 可选的文件名 */
  name?: string;
  /** 可选的 MIME 类型 */
  mimeType?: string;
}

/** 预览模式 */
export type ViewMode = 'single' | 'carousel' | 'slideshow' | 'gallery';

/** 变换状态 */
export interface TransformState {
  /** 旋转角度 (0, 90, 180, 270) */
  rotation: number;
  /** 水平翻转 */
  flipX: boolean;
  /** 垂直翻转 */
  flipY: boolean;
  /** 缩放比例 */
  scale: number;
  /** X 轴偏移 */
  offsetX: number;
  /** Y 轴偏移 */
  offsetY: number;
}

/** 放大镜配置 */
export interface MagnifierConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 放大倍率，默认 2 */
  zoom: number;
  /** 镜片半径(px)，默认 80 */
  radius: number;
}

/** 工具栏按钮项 */
export type ToolbarItem = 
  | 'rotateLeft' | 'rotateRight' 
  | 'flipX' | 'flipY' 
  | 'zoomIn' | 'zoomOut' | 'reset'
  | 'prev' | 'next'
  | 'fullscreen' | 'download'
  | 'magnifier'
  | 'info'
  | 'mode'; // 模式切换组

/** 工具栏位置 */
export type ToolbarPosition = 'top' | 'bottom';

/** 工具栏显示模式 */
export type ToolbarMode = 'fixed' | 'float';

/** 工具栏配置 */
export interface ToolbarConfig {
  items: ToolbarItem[];
  /** 工具栏位置，默认 'bottom' */
  position?: ToolbarPosition;
  /** 工具栏显示模式，默认 'fixed' */
  mode?: ToolbarMode;
}

/** 查看器配置 */
export interface ViewerConfig {
  /** 预览模式，默认 'single' */
  mode: ViewMode;
  /** 只读模式（禁止复制、下载），默认 false */
  readonly: boolean;
  /** 放大镜配置 */
  magnifier: MagnifierConfig;
  /** 幻灯片/轮播自动播放，默认 false */
  autoPlay: boolean;
  /** 自动播放间隔(ms)，默认 3000 */
  interval: number;
  /** 是否显示工具栏，默认 true */
  showToolbar: boolean;
  /** 工具栏配置 */
  toolbar: ToolbarConfig;
  /** 是否启用渐进式加载，默认 true */
  progressiveLoading: boolean;
  /** 渐进式加载阈值(字节)，默认 1MB */
  progressiveThreshold: number;
  /** 主题，默认 'dark' */
  theme: ThemeName;
  /** 语言，默认 'zh-CN' */
  locale: LocaleName | string;
}

/** 图片加载状态 */
export type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

/** 内部使用 - 已加载的图片 */
export interface LoadedImage {
  /** 原始来源 */
  source: ImageSource;
  /** 可显示的 blob URL */
  blobUrl: string;
  /** 图片宽度 */
  width: number;
  /** 图片高度 */
  height: number;
  /** 文件大小(字节) */
  size: number;
  /** 文件名 */
  name: string;
  /** 是否经过格式转换 */
  converted: boolean;
}

/** 查看器事件 */
export interface ViewerEventMap {
  'image-load': CustomEvent<{ index: number; image: LoadedImage }>;
  'image-error': CustomEvent<{ index: number; error: Error }>;
  'image-change': CustomEvent<{ index: number; image: LoadedImage }>;
  'mode-change': CustomEvent<{ mode: ViewMode }>;
  'transform-change': CustomEvent<{ transform: TransformState }>;
}

/** 默认配置 */
export const DEFAULT_CONFIG: ViewerConfig = {
  mode: 'single',
  readonly: false,
  magnifier: {
    enabled: false,
    zoom: 2,
    radius: 80,
  },
  autoPlay: false,
  interval: 3000,
  showToolbar: true,
  toolbar: {
    items: [
      'rotateLeft', 'rotateRight', 'flipX', 'flipY', 
      'zoomIn', 'zoomOut', 'reset', 
      'prev', 'next', // 多图时自动显示
      'mode', 
      'magnifier', 'info', 'fullscreen', 'download'
    ],
    position: 'bottom',
    mode: 'fixed',
  },
  progressiveLoading: true,
  progressiveThreshold: 1024 * 1024, // 1MB
  theme: 'dark',
  locale: 'zh-CN',
};

/** 默认变换状态 */
export const DEFAULT_TRANSFORM: TransformState = {
  rotation: 0,
  flipX: false,
  flipY: false,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

/** 浏览器原生支持的图片 MIME 类型 */
export const NATIVE_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/avif',
]);
