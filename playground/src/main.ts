/**
 * Playground 主入口
 */

import '@jacktea/img-viewer';
import type { ImgViewerElement, ImageSource } from '@jacktea/img-viewer';
import { DEFAULT_CONFIG } from '@jacktea/img-viewer';

// ===== Tab 切换 =====
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

let vueUnmount: (() => void) | null = null;
let reactUnmount: (() => void) | null = null;

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const tab = btn.getAttribute('data-tab')!;
    tabButtons.forEach((b) => b.classList.remove('active'));
    tabPanels.forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${tab}`)?.classList.add('active');

    // 懒加载 Vue / React Demo
    if (tab === 'vue' && !vueUnmount) {
      import('./demo-vue').then(({ mountVueDemo }) => {
        vueUnmount = mountVueDemo(document.getElementById('vue-app')!);
      });
    }
    if (tab === 'react' && !reactUnmount) {
      import('./demo-react').then(({ mountReactDemo }) => {
        reactUnmount = mountReactDemo(document.getElementById('react-app')!);
      });
    }
  });
});

// ===== 原生组件演示 =====
const viewer = document.getElementById('native-viewer') as ImgViewerElement;
const urlInput = document.getElementById('url-input') as HTMLInputElement;

// 工具栏自定义测试
const toggleToolbarBtn = document.createElement('button');
toggleToolbarBtn.className = 'btn';
toggleToolbarBtn.textContent = '🛠️ 自定义工具栏 (仅缩放)';
toggleToolbarBtn.style.marginLeft = '12px';
document.querySelector('.controls .control-group:last-child')?.appendChild(toggleToolbarBtn);

let isCustomToolbar = false;
toggleToolbarBtn.addEventListener('click', () => {
  isCustomToolbar = !isCustomToolbar;
  if (isCustomToolbar) {
    viewer.setConfig({ 
      toolbar: {
        items: [
          'rotateLeft', 'rotateRight', 'flipX', 'flipY', 
          'zoomIn', 'zoomOut', 'reset', 
          'prev', 'next', // 多图时自动显示
          'mode', 
          'magnifier', 'info', 'fullscreen'
        ],
        position: 'bottom',
        mode: 'float',
      } });
    toggleToolbarBtn.textContent = '🛠️ 恢复默认工具栏';
  } else {
    viewer.setConfig({ toolbar: DEFAULT_CONFIG.toolbar });
    toggleToolbarBtn.textContent = '🛠️ 自定义工具栏 (仅缩放)';
  }
});

// 打开本地文件
document.getElementById('btn-open-local')!.addEventListener('click', () => {
  viewer.openFileDialog();
});

// 加载远程图片
document.getElementById('btn-open-url')!.addEventListener('click', () => {
  const url = urlInput.value.trim();
  if (url) {
    viewer.open({ type: 'url', data: url });
  }
});

// 加载多张图片
document.getElementById('btn-load-multiple')!.addEventListener('click', () => {
  const sources: ImageSource[] = [];
  for (let i = 1; i <= 6; i++) {
    sources.push({
      type: 'url',
      data: `https://picsum.photos/800/600?random=${i}&t=${Date.now()}`,
      name: `Photo ${i}.jpg`,
    });
  }
  viewer.open(sources);
});

// 模式切换
document.getElementById('mode-select')!.addEventListener('change', (e) => {
  const mode = (e.target as HTMLSelectElement).value as 'single' | 'carousel' | 'slideshow' | 'gallery';
  viewer.setMode(mode);
});

// 只读模式
document.getElementById('readonly-check')!.addEventListener('change', (e) => {
  const checked = (e.target as HTMLInputElement).checked;
  if (checked) {
    viewer.setAttribute('readonly', '');
  } else {
    viewer.removeAttribute('readonly');
  }
});

// 事件监听
viewer.addEventListener('image-load', ((e: CustomEvent) => {
  console.log('📷 Image loaded:', e.detail);
}) as EventListener);

viewer.addEventListener('image-error', ((e: CustomEvent) => {
  console.error('❌ Image error:', e.detail);
}) as EventListener);

viewer.addEventListener('mode-change', ((e: CustomEvent) => {
  console.log('🔄 Mode changed:', e.detail);
}) as EventListener);

// 默认加载一张图片
viewer.open({
  type: 'url',
  data: 'https://picsum.photos/1200/800?random=0',
  name: 'welcome.jpg',
});
