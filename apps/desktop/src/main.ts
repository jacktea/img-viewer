/**
 * ImgViewer Desktop - 主入口
 */

import '@jacktea/img-viewer';
import type { ImgViewerElement, ImageSource, ViewMode } from '@jacktea/img-viewer';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { Sidebar, SidebarFile } from './sidebar';
import { Ruler } from './ruler';
import { Screenshot } from './screenshot';

// ===== 类型 =====
interface ImageFileInfo {
  path: string;
  name: string;
  size: number;
}

interface ImageData {
  base64: string;
  mime_type: string;
  name: string;
  size: number;
  converted: boolean;
  original_format?: string;
}

// ===== 状态 =====
let currentFiles: ImageFileInfo[] = [];
let currentIndex = 0;
let currentMode: ViewMode = 'single';

// ===== DOM 引用 =====
const viewer = document.getElementById('viewer') as ImgViewerElement;
const welcomeOverlay = document.getElementById('welcome-overlay')!;
const titleEl = document.getElementById('app-title')!;
const imageInfoEl = document.getElementById('image-info')!;
const btnOpen = document.getElementById('btn-open')!;
const btnRuler = document.getElementById('btn-ruler')!;
const btnScreenshot = document.getElementById('btn-screenshot')!;
const btnWelcomeOpen = document.getElementById('btn-welcome-open')!;

// ===== 初始化组件// 初始化侧边栏
const sidebar = new Sidebar({
  onSelect: (file, index) => {
    if (index !== currentIndex) {
      loadImageByIndex(index);
    }
  },
  onLoadThumbnail: async (index) => {
    if (currentFiles[index]) {
      try {
        // 请求后端生成缩略图
        return await invoke<string>('read_image_thumbnail', {
          filePath: currentFiles[index].path,
        });
      } catch (e) {
        console.error('Thumbnail load failed', e);
        throw e;
      }
    }
    return '';
  }
});

// 初始化标尺
const ruler = new Ruler();

// 初始化截图工具
const screenshot = new Screenshot(() => {
  // onDeactivate 回调：移除按钮激活状态
  btnScreenshot.classList.remove('active');
});

// ===== 打开文件对话框 =====
async function openFileDialog(): Promise<void> {
  const selected = await open({
    multiple: true,
    filters: [{
      name: '图片文件',
      extensions: [
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif',
        'tiff', 'tif', 'ico', 'heic', 'heif',
        'jbig', 'jbg', 'bie', 'jng', 'jp2', 'j2k', 'jpf', 'jpx', 'jpm', 'mj2', 'exr',
        'raw', 'arw', 'cr2', 'nef', 'orf', 'sr2', 'dng',
        'psd'
      ],
    }],
  });

  if (!selected) return;

  const paths = Array.isArray(selected) ? selected : [selected];
  if (paths.length === 0) return;

  await handleOpenFiles(paths);
}

// ===== 处理打开的文件 =====
async function handleOpenFiles(paths: string[]) {
  welcomeOverlay.style.display = 'none';

  if (paths.length === 1) {
    // 单文件：加载所在目录的所有图片
    const dirImages: ImageFileInfo[] = await invoke('list_directory_images', {
      filePath: paths[0],
    });
    currentFiles = dirImages;

    // 找到当前文件的索引
    currentIndex = dirImages.findIndex((f) => f.path === paths[0]);
    if (currentIndex < 0) currentIndex = 0;
  } else {
    // 多文件：仅加载选中的
    currentFiles = paths.map((p) => {
      // 简单提取文件名
      const parts = p.split(/[/\\]/);
      return {
        path: p,
        name: parts[parts.length - 1] || p,
        size: 0,
      };
    });
    currentIndex = 0;
  }

  // 更新侧边栏
  sidebar.setFiles(currentFiles.map((f) => ({
    path: f.path,
    name: f.name,
    size: f.size,
  })));



  // 加载当前图片
  await loadImageByIndex(currentIndex);
}

// ===== 加载指定图片 =====
async function loadImageByIndex(index: number): Promise<void> {
  if (index < 0 || index >= currentFiles.length) return;
  currentIndex = index;
  sidebar.setActive(index);

  const file = currentFiles[index];
  titleEl.textContent = file.name;

  try {
    // 尝试获取元数据（优化模式）
    const data: ImageData = await invoke('read_image_file', {
      filePath: file.path,
      forceRead: false,
    });

    // Determine source type based on backend response
    let source: ImageSource;
    if (data.base64) {
      source = {
        type: 'base64',
        data: data.base64,
        name: data.name,
        mimeType: data.mime_type,
      };
    } else {
      // Backend returned metadata only, load directly via custom img:// protocol
      // Ensure we use localhost as authority and encode the path correctly
      const url = new URL('img://localhost');
      url.pathname = file.path;
      const imgUrl = url.href;
      
      source = {
        type: 'url',
        data: imgUrl,
        name: data.name,
        mimeType: data.mime_type,
      };
    }

    // 通过 img-viewer 打开图片
    // 如果是多图模式且有多张图片，加载所有
    if (currentMode !== 'single' && currentFiles.length > 1) {
      await loadAllImages();
    } else {
      await viewer.open(source);
    }

    // 更新图片信息
    updateImageInfo(data); // Using original metadata is fine

    // 更新标尺
    viewer.addEventListener('image-load', ((e: CustomEvent) => {
      const img = e.detail.image;
      ruler.setImageSize(img.width, img.height);
    }) as EventListener, { once: true });

  } catch (err) {
    console.error('加载图片失败:', err);
  }
}

// ===== 多图模式加载所有图片 =====
async function loadAllImages(): Promise<void> {
  const sources: ImageSource[] = [];

  for (const file of currentFiles) {
    try {
      const data: ImageData = await invoke('read_image_file', {
        filePath: file.path,
        forceRead: false,
      });
      
      if (data.base64) {
        sources.push({
          type: 'base64',
          data: data.base64,
          name: data.name,
          mimeType: data.mime_type,
        });
      } else {
        const url = new URL('img://localhost');
        url.pathname = file.path;
        const imgUrl = url.href;

        sources.push({
          type: 'url',
          data: imgUrl,
          name: data.name,
          mimeType: data.mime_type,
        });
      }
    } catch (err) {
      console.error(`加载失败: ${file.name}`, err);
    }
  }

  if (sources.length > 0) {
    await viewer.open(sources);
  }
}

// ===== 更新图片信息 =====
function updateImageInfo(data: ImageData): void {
  const sizeStr = data.size < 1024 * 1024
    ? `${(data.size / 1024).toFixed(1)} KB`
    : `${(data.size / (1024 * 1024)).toFixed(1)} MB`;

  const posStr = `${currentIndex + 1}/${currentFiles.length}`;
  
  // 如果有原始格式，优先显示
  const fmtStr = data.original_format ? ` · ${data.original_format}` : '';
  const convertedStr = data.converted ? ' (已转换)' : '';

  imageInfoEl.textContent = `${posStr} · ${sizeStr}${fmtStr}${convertedStr}`;
}

// ===== 模式相关：单图模式下才可用标尺和截图 =====
function updateModeUI(mode: ViewMode): void {
  currentMode = mode;
  const isSingle = mode === 'single';

  // 标尺按钮
  btnRuler.toggleAttribute('disabled', !isSingle);
  if (!isSingle && ruler.isVisible()) {
    ruler.hide();
    btnRuler.classList.remove('active');
  }

  // 截图按钮
  btnScreenshot.toggleAttribute('disabled', !isSingle);
  if (!isSingle && screenshot.isActive()) {
    screenshot.deactivate();
    btnScreenshot.classList.remove('active');
  }
}

// ===== 事件绑定 =====

// 打开按钮
btnOpen.addEventListener('click', openFileDialog);
btnWelcomeOpen.addEventListener('click', openFileDialog);

// 标尺按钮
btnRuler.addEventListener('click', () => {
  if (currentMode !== 'single') return;
  const visible = ruler.toggle();
  btnRuler.classList.toggle('active', visible);
});

// 截图按钮
btnScreenshot.addEventListener('click', () => {
  if (currentMode !== 'single') return;
  if (screenshot.isActive()) {
    screenshot.deactivate();
    btnScreenshot.classList.remove('active');
  } else {
    screenshot.activate();
    btnScreenshot.classList.add('active');

    // 传递当前图片信息给截图工具
    const images = viewer.getImages();
    if (images.length > 0) {
      const imgEl = viewer.shadowRoot?.querySelector('.iv-single-image') as HTMLImageElement | null;
      if (imgEl) {
        screenshot.setImage(imgEl, 1, 0, 0);
      }
    }
  }
});

// 键盘快捷键
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    if (currentMode === 'single' && currentIndex > 0) {
      loadImageByIndex(currentIndex - 1);
    }
  } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    if (currentMode === 'single' && currentIndex < currentFiles.length - 1) {
      loadImageByIndex(currentIndex + 1);
    }
  } else if (e.key === 'Escape') {
    if (screenshot.isActive()) {
      screenshot.deactivate();
      btnScreenshot.classList.remove('active');
    }
  }
});

// 监听 img-viewer 模式切换事件
viewer.addEventListener('mode-change', ((e: CustomEvent) => {
  updateModeUI(e.detail.mode);
}) as EventListener);

// 监听 img-viewer transform 事件（同步标尺）
viewer.addEventListener('transform-change', ((e: CustomEvent) => {
  const t = e.detail.transform;
  ruler.updateTransform(t.scale, t.offsetX, t.offsetY);

  // 同步截图工具的图片信息
  if (screenshot.isActive()) {
    const imgEl = viewer.shadowRoot?.querySelector('.iv-single-image') as HTMLImageElement | null;
    if (imgEl) {
      screenshot.setImage(imgEl, t.scale, t.offsetX, t.offsetY);
    }
  }
}) as EventListener);

// ===== Tauri 文件关联事件 =====
listen<string[]>('open-files', async (event) => {
  const paths = event.payload;
  if (paths && paths.length > 0) {
    await handleOpenFiles(paths);
  }
});

// 初始模式设置
updateModeUI('single');
