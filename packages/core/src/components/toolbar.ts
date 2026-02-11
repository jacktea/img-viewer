/**
 * 工具栏组件 - SVG 图标按钮
 */

import { ViewMode, ToolbarConfig, ToolbarItem, DEFAULT_CONFIG, ToolbarPosition, ToolbarMode } from '../types';
import { I18nMessages } from '../i18n';

/** 工具栏事件 */
export interface ToolbarEvents {
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onFlipX: () => void;
  onFlipY: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onToggleMagnifier: (enabled: boolean) => void;
  onModeChange: (mode: ViewMode) => void;
  onFullscreen: () => void;
  onDownload: () => void;
  onPrev: () => void;
  onNext: () => void;
  onInfo: () => void;
}

/** SVG 图标集 */
const ICONS = {
  rotateLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2.5 2v6h6M2.66 15.57a10 10 0 1 0 .57-8.38"/></svg>`,
  rotateRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"/></svg>`,
  flipX: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/><path d="M12 20v2"/><path d="M12 14v2"/><path d="M12 8v2"/><path d="M12 2v2"/></svg>`,
  flipY: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8V5a2 2 0 0 1 2-2h14c1.1 0 2 .9 2 2v3"/><path d="M3 16v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"/><path d="M2 12h4"/><path d="M10 12h4"/><path d="M18 12h4"/></svg>`,
  zoomIn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`,
  zoomOut: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`,
  reset: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`,
  magnifier: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  fullscreen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  prev: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15,18 9,12 15,6"/></svg>`,
  next: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg>`,
  single: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`,
  carousel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 18v2"/><path d="M8 18v2"/><path d="M16 18v2"/></svg>`,
  slideshow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2"/><polygon points="10,8 16,12 10,16"/></svg>`,
  gallery: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
  info: `<svg viewBox="0 0 1024 1024" width="32" height="32"><path d="M512 896C299.936 896 128 724.064 128 512S299.936 128 512 128s384 171.936 384 384-171.936 384-384 384m0-832C264.96 64 64 264.96 64 512s200.96 448 448 448 448-200.96 448-448S759.04 64 512 64" fill="currentColor"></path><path d="M480 768h64v-288h-64zM512 272a48 48 0 1 0 0 96 48 48 0 0 0 0-96" fill="currentColor"></path></svg>`,
};

export class Toolbar {
  private element: HTMLElement;
  private events: Partial<ToolbarEvents>;
  private isReadonly: boolean;
  private hasMultiple: boolean;
  private currentMode: ViewMode;
  private magnifierEnabled: boolean;
  private config: ToolbarConfig;
  private messages: I18nMessages;

  constructor(
    container: HTMLElement,
    events: Partial<ToolbarEvents>,
    options: {
      readonly?: boolean;
      hasMultiple?: boolean;
      currentMode?: ViewMode;
      magnifierEnabled?: boolean;
      toolbar?: ToolbarConfig;
      messages?: I18nMessages;
    } = {}
  ) {
    this.events = events;
    this.isReadonly = options.readonly || false;
    this.hasMultiple = options.hasMultiple || false;
    this.currentMode = options.currentMode || 'single';
    this.magnifierEnabled = options.magnifierEnabled || false;
    this.config = options.toolbar || DEFAULT_CONFIG.toolbar;

    // 使用提供的 messages 或导入默认
    this.messages = options.messages || {
      rotateLeft: '逆时针旋转', rotateRight: '顺时针旋转',
      flipX: '水平翻转', flipY: '垂直翻转',
      zoomIn: '放大', zoomOut: '缩小', reset: '重置',
      prev: '上一张', next: '下一张',
      fullscreen: '全屏', download: '下载',
      magnifier: '放大镜', info: '文件信息',
      modeSingle: '单图', modeCarousel: '轮播',
      modeSlideshow: '幻灯片', modeGallery: '相册',
    } as I18nMessages;

    this.element = document.createElement('div');
    this.element.className = 'iv-toolbar';
    this.applyToolbarClasses();
    container.appendChild(this.element);
    this.render();
  }

  private applyToolbarClasses(): void {
    const position = this.config.position || 'bottom';
    const mode = this.config.mode || 'fixed';

    this.element.classList.toggle('iv-toolbar-top', position === 'top');
    this.element.classList.toggle('iv-toolbar-float', mode === 'float');
  }

  private render(): void {
    this.element.innerHTML = '';
    const m = this.messages;

    // 左侧：变换操作（Transform）
    const leftItems = this.filterItems(['rotateLeft', 'rotateRight', 'flipX', 'flipY', 'zoomIn', 'zoomOut', 'reset']);
    if (leftItems.length > 0) {
      const leftGroup = this.createGroup('iv-toolbar-group iv-toolbar-left');
      leftItems.forEach(item => this.renderItem(leftGroup, item, m));
    }

    // 中间：导航与模式（Navigation & Mode）
    const centerItems = this.filterItems(['prev', 'next', 'mode']);
    if (centerItems.length > 0) {
      const centerGroup = this.createGroup('iv-toolbar-group iv-toolbar-center');
      centerItems.forEach(item => this.renderItem(centerGroup, item, m));
    }

    // 右侧：功能操作（Feature）
    const rightItems = this.filterItems(['magnifier', 'info', 'fullscreen', 'download']);
    if (rightItems.length > 0) {
      const rightGroup = this.createGroup('iv-toolbar-group iv-toolbar-right');
      rightItems.forEach(item => this.renderItem(rightGroup, item, m));
    }
  }

  /* 过滤掉当前模式不支持的按钮 */
  private filterItems(groupItems: ToolbarItem[]): ToolbarItem[] {
    return groupItems.filter(item => {
      // 1. 用户配置中必须存在
      if (!this.config.items.includes(item)) return false;

      // 2. 只读模式下隐藏下载
      if (item === 'download' && this.isReadonly) return false;

      // 3. 多图模式下才显示上一张/下一张
      if ((item === 'prev' || item === 'next') && !this.hasMultiple) return false;

      // 4. Transform 和 Magnifier 仅在 Single 模式下显示
      const transformItems: ToolbarItem[] = ['rotateLeft', 'rotateRight', 'flipX', 'flipY', 'zoomIn', 'zoomOut', 'reset', 'magnifier'];
      if (transformItems.includes(item) && this.currentMode !== 'single') {
        return false;
      }

      return true;
    });
  }

  private renderItem(group: HTMLElement, item: ToolbarItem, m: I18nMessages): void {
    switch (item) {
      case 'rotateLeft':
        this.addButton(group, 'rotateLeft', ICONS.rotateLeft, m.rotateLeft, () => this.events.onRotateLeft?.());
        break;
      case 'rotateRight':
        this.addButton(group, 'rotateRight', ICONS.rotateRight, m.rotateRight, () => this.events.onRotateRight?.());
        break;
      case 'flipX':
        this.addButton(group, 'flipX', ICONS.flipX, m.flipX, () => this.events.onFlipX?.());
        break;
      case 'flipY':
        this.addButton(group, 'flipY', ICONS.flipY, m.flipY, () => this.events.onFlipY?.());
        break;
      case 'zoomIn':
        this.addButton(group, 'zoomIn', ICONS.zoomIn, m.zoomIn, () => this.events.onZoomIn?.());
        break;
      case 'zoomOut':
        this.addButton(group, 'zoomOut', ICONS.zoomOut, m.zoomOut, () => this.events.onZoomOut?.());
        break;
      case 'reset':
        this.addButton(group, 'reset', ICONS.reset, m.reset, () => this.events.onResetZoom?.());
        break;
      case 'prev':
        this.addButton(group, 'prev', ICONS.prev, m.prev, () => this.events.onPrev?.());
        break;
      case 'next':
        this.addButton(group, 'next', ICONS.next, m.next, () => this.events.onNext?.());
        break;
      case 'mode':
        if (this.hasMultiple) {
          const isFloat = (this.config.mode || 'fixed') === 'float';
          if (isFloat) {
            this.renderCyclicModeButton(group, m);
          } else {
            this.renderModeButtons(group, m);
          }
        }
        break;
      case 'magnifier': {
        const btn = this.addButton(group, 'magnifier', ICONS.magnifier, m.magnifier, () => {
          this.magnifierEnabled = !this.magnifierEnabled;
          btn.classList.toggle('active', this.magnifierEnabled);
          this.events.onToggleMagnifier?.(this.magnifierEnabled);
        });
        if (this.magnifierEnabled) btn.classList.add('active');
        break;
      }
      case 'info':
        this.addButton(group, 'info', ICONS.info, m.info, () => this.events.onInfo?.());
        break;
      case 'fullscreen':
        this.addButton(group, 'fullscreen', ICONS.fullscreen, m.fullscreen, () => this.events.onFullscreen?.());
        break;
      case 'download':
        this.addButton(group, 'download', ICONS.download, m.download, () => this.events.onDownload?.());
        break;
    }
  }

  /** 浮动模式：单按钮循环切换模式 */
  private renderCyclicModeButton(group: HTMLElement, m: I18nMessages): void {
    const modes: { mode: ViewMode; icon: string; label: string }[] = [
      { mode: 'single', icon: ICONS.single, label: m.modeSingle },
      { mode: 'carousel', icon: ICONS.carousel, label: m.modeCarousel },
      { mode: 'slideshow', icon: ICONS.slideshow, label: m.modeSlideshow },
      { mode: 'gallery', icon: ICONS.gallery, label: m.modeGallery },
    ];

    const currentIdx = modes.findIndex(({ mode }) => mode === this.currentMode);
    const current = modes[currentIdx >= 0 ? currentIdx : 0];

    const btn = this.addButton(group, 'mode-cycle', current.icon, current.label, () => {
      const idx = modes.findIndex(({ mode }) => mode === this.currentMode);
      const nextIdx = (idx + 1) % modes.length;
      const next = modes[nextIdx];
      this.currentMode = next.mode;
      btn.innerHTML = next.icon;
      btn.title = next.label;
      this.events.onModeChange?.(next.mode);
    });
    btn.classList.add('active');
  }

  private renderModeButtons(group: HTMLElement, m: I18nMessages): void {
    const modes: { mode: ViewMode; icon: string; label: string }[] = [
      { mode: 'single', icon: ICONS.single, label: m.modeSingle },
      { mode: 'carousel', icon: ICONS.carousel, label: m.modeCarousel },
      { mode: 'slideshow', icon: ICONS.slideshow, label: m.modeSlideshow },
      { mode: 'gallery', icon: ICONS.gallery, label: m.modeGallery },
    ];
    
    // 添加分割线
    const container = document.createElement('div');
    container.className = 'iv-toolbar-mode-group';
    group.appendChild(container);

    modes.forEach(({ mode, icon, label }) => {
      const btn = this.addButton(container, `mode-${mode}`, icon, label, () => {
        this.currentMode = mode;
        this.events.onModeChange?.(mode);
        this.updateModeButtons();
      });
      if (mode === this.currentMode) {
        btn.classList.add('active');
      }
    });
  }

  private createGroup(className: string): HTMLElement {
    const group = document.createElement('div');
    group.className = className;
    this.element.appendChild(group);
    return group;
  }

  private addButton(
    group: HTMLElement,
    id: string,
    icon: string,
    title: string,
    onClick: () => void
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'iv-toolbar-btn';
    btn.setAttribute('data-action', id);
    btn.title = title;
    btn.innerHTML = icon;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    group.appendChild(btn);
    return btn;
  }

  private updateModeButtons(): void {
    this.element.querySelectorAll('[data-action^="mode-"]').forEach((btn) => {
      const mode = btn.getAttribute('data-action')?.replace('mode-', '');
      btn.classList.toggle('active', mode === this.currentMode);
    });
  }

  update(options: {
    readonly?: boolean;
    hasMultiple?: boolean;
    currentMode?: ViewMode;
    magnifierEnabled?: boolean;
    toolbar?: ToolbarConfig;
    messages?: I18nMessages;
  }): void {
    if (options.readonly !== undefined) this.isReadonly = options.readonly;
    if (options.hasMultiple !== undefined) this.hasMultiple = options.hasMultiple;
    if (options.currentMode !== undefined) this.currentMode = options.currentMode;
    if (options.magnifierEnabled !== undefined) this.magnifierEnabled = options.magnifierEnabled;
    if (options.toolbar !== undefined) this.config = options.toolbar;
    if (options.messages !== undefined) this.messages = options.messages;
    this.applyToolbarClasses();
    this.render();
  }

  destroy(): void {
    this.element.remove();
  }
}
