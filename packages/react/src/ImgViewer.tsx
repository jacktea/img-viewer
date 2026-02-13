import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import '@jacktea/img-viewer';
import type { ImageSource, ViewMode, ImgViewerElement, DecoderType } from '@jacktea/img-viewer';

export interface ImgViewerProps {
  /** 图片来源列表 */
  sources?: ImageSource[];
  /** 预览模式 */
  mode?: ViewMode;
  /** 只读 */
  readonly?: boolean;
  /** 自动播放 */
  autoPlay?: boolean;
  /** 自动播放间隔 (ms) */
  interval?: number;
  /** 解码模式 */
  decodeType?: DecoderType;
  /** rgba16 失败时是否回退到 rgba8 */
  decodeFallback?: boolean;
  /** 图片加载回调 */
  onImageLoad?: (detail: { index: number }) => void;
  /** 图片加载错误 */
  onImageError?: (detail: { index: number; error: Error }) => void;
  /** 图片切换 */
  onImageChange?: (detail: { index: number }) => void;
  /** 模式切换 */
  onModeChange?: (detail: { mode: ViewMode }) => void;
  /** 样式类名 */
  className?: string;
  /** 行内样式 */
  style?: React.CSSProperties;
}

export interface ImgViewerRef {
  /** 获取底层 Web Component 实例 */
  getElement: () => ImgViewerElement | null;
  /** 打开图片 */
  open: (sources: ImageSource[]) => void;
  /** 打开文件选择器 */
  openFileDialog: () => void;
  /** 设置模式 */
  setMode: (mode: ViewMode) => void;
  /** 下载当前图片 */
  downloadCurrent: () => void;
}

export const ImgViewer = forwardRef<ImgViewerRef, ImgViewerProps>(function ImgViewer(
  {
    sources,
    mode = 'single',
    readonly: isReadonly = false,
    autoPlay = false,
    interval = 3000,
    decodeType = 'auto',
    decodeFallback = true,
    onImageLoad,
    onImageError,
    onImageChange,
    onModeChange,
    className,
    style,
  },
  ref
) {
  const elementRef = useRef<ImgViewerElement>(null);

  // 暴露方法
  useImperativeHandle(ref, () => ({
    getElement: () => elementRef.current,
    open: (sources: ImageSource[]) => elementRef.current?.open(sources),
    openFileDialog: () => elementRef.current?.openFileDialog(),
    setMode: (mode: ViewMode) => elementRef.current?.setMode(mode),
    downloadCurrent: () => elementRef.current?.downloadCurrent(),
  }));

  // 事件绑定
  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const handlers: [string, EventListener][] = [];
    
    if (onImageLoad) {
      const h = ((e: CustomEvent) => onImageLoad(e.detail)) as EventListener;
      el.addEventListener('image-load', h);
      handlers.push(['image-load', h]);
    }
    if (onImageError) {
      const h = ((e: CustomEvent) => onImageError(e.detail)) as EventListener;
      el.addEventListener('image-error', h);
      handlers.push(['image-error', h]);
    }
    if (onImageChange) {
      const h = ((e: CustomEvent) => onImageChange(e.detail)) as EventListener;
      el.addEventListener('image-change', h);
      handlers.push(['image-change', h]);
    }
    if (onModeChange) {
      const h = ((e: CustomEvent) => onModeChange(e.detail)) as EventListener;
      el.addEventListener('mode-change', h);
      handlers.push(['mode-change', h]);
    }

    return () => {
      handlers.forEach(([event, handler]) => el.removeEventListener(event, handler));
    };
  }, [onImageLoad, onImageError, onImageChange, onModeChange]);

  // sources 变化时重新加载
  useEffect(() => {
    if (sources && sources.length > 0 && elementRef.current) {
      elementRef.current.open(sources);
    }
  }, [sources]);

  // 清理
  useEffect(() => {
    return () => {
      elementRef.current?.destroy();
    };
  }, []);

  // 构建属性
  const attrs: Record<string, string | undefined> = {
    mode,
    interval: String(interval),
    'decode-type': decodeType,
    'decode-fallback': String(decodeFallback),
  };
  if (isReadonly) attrs.readonly = '';
  if (autoPlay) attrs['auto-play'] = '';

  return React.createElement('img-viewer', {
    ref: elementRef,
    class: className,
    style,
    ...attrs,
  });
});
