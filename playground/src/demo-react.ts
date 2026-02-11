/**
 * React 组件 Demo
 */
import React, { useState, useRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ImgViewer } from '@jacktea/img-viewer-react';
import type { ImgViewerRef, ImageSource, ViewMode } from '@jacktea/img-viewer-react';

function ReactDemo() {
  const [sources, setSources] = useState<ImageSource[]>([]);
  const [mode, setMode] = useState<ViewMode>('single');
  const [isReadonly, setIsReadonly] = useState(false);
  const viewerRef = useRef<ImgViewerRef>(null);

  const loadMultiple = () => {
    setSources(
      Array.from({ length: 6 }, (_, i) => ({
        type: 'url' as const,
        data: `https://picsum.photos/800/600?random=${i + 20}&t=${Date.now()}`,
        name: `React Photo ${i + 1}.jpg`,
      }))
    );
  };

  const openLocal = () => {
    viewerRef.current?.openFileDialog();
  };

  return React.createElement('div', null,
    React.createElement('div', { className: 'controls' },
      React.createElement('div', { className: 'control-group' },
        React.createElement('button', { className: 'btn btn-primary', onClick: openLocal }, '📂 打开本地文件'),
      ),
      React.createElement('div', { className: 'control-group' },
        React.createElement('button', { className: 'btn', onClick: loadMultiple }, '🖼️ 加载多张图片'),
      ),
      React.createElement('div', { className: 'control-group' },
        React.createElement('label', null, '模式: '),
        React.createElement('select', {
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setMode(e.target.value as ViewMode),
        },
          React.createElement('option', { value: 'single' }, '单图'),
          React.createElement('option', { value: 'carousel' }, '轮播图'),
          React.createElement('option', { value: 'slideshow' }, '幻灯片'),
          React.createElement('option', { value: 'gallery' }, '相册'),
        ),
      ),
      React.createElement('div', { className: 'control-group' },
        React.createElement('label', null,
          React.createElement('input', {
            type: 'checkbox',
            checked: isReadonly,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => setIsReadonly(e.target.checked),
          }),
          ' 只读模式',
        ),
      ),
    ),
    React.createElement('div', { className: 'viewer-container' },
      React.createElement(ImgViewer, {
        ref: viewerRef,
        sources,
        mode,
        readonly: isReadonly,
        autoPlay: false,
        onImageLoad: (d) => console.log('[React] image-load', d),
      }),
    ),
  );
}

let root: Root | null = null;

export function mountReactDemo(container: HTMLElement) {
  root = createRoot(container);
  root.render(React.createElement(ReactDemo));
  return () => {
    root?.unmount();
    root = null;
  };
}
