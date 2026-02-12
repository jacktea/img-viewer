/**
 * ImgViewerElement - 主 Web Component
 * 
 * 用法:
 * <img-viewer mode="single" readonly src='["url1.jpg"]'></img-viewer>
 */

import {
  ImageSource,
  ViewMode,
  ViewerConfig,
  LoadedImage,
  DEFAULT_CONFIG,
  LoadingState,
} from './types';
import { ImageLoader } from './core/image-loader';
import { ProgressiveLoader } from './core/progressive-loader';
import { Toolbar } from './components/toolbar';
import { ViewerSingle } from './components/viewer-single';
import { ViewerCarousel } from './components/viewer-carousel';
import { ViewerSlideshow } from './components/viewer-slideshow';
import { ViewerGallery } from './components/viewer-gallery';
import { FileInfoPanel } from './components/file-info';
import { getMessages, I18nMessages } from './i18n';
import { ThemeName } from './types';

// 导入样式
import variablesStyles from './styles/variables.css?inline';
import baseStyles from './styles/base.css?inline';
import viewerStyles from './styles/viewer.css?inline';
import toolbarStyles from './styles/toolbar.css?inline';
import carouselStyles from './styles/carousel.css?inline';
import slideshowStyles from './styles/slideshow.css?inline';
import galleryStyles from './styles/gallery.css?inline';
import magnifierStyles from './styles/magnifier.css?inline';
import fileInfoStyles from './styles/file-info.css?inline';

const ALL_STYLES = [
  variablesStyles,
  baseStyles,
  viewerStyles,
  toolbarStyles,
  carouselStyles,
  slideshowStyles,
  galleryStyles,
  magnifierStyles,
  fileInfoStyles,
].join('\n');

export class ImgViewerElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['mode', 'readonly', 'src', 'auto-play', 'interval', 'theme', 'locale'];
  }

  // ===== Properties =====

  get mode(): ViewMode {
    return this.config.mode;
  }
  set mode(value: ViewMode) {
    this.setAttribute('mode', value);
  }

  get readonly(): boolean {
    return this.config.readonly;
  }
  set readonly(value: boolean) {
    if (value) {
      this.setAttribute('readonly', '');
    } else {
      this.removeAttribute('readonly');
    }
  }

  get autoPlay(): boolean {
    return this.config.autoPlay;
  }
  set autoPlay(value: boolean) {
    if (value) {
      this.setAttribute('auto-play', '');
    } else {
      this.removeAttribute('auto-play');
    }
  }

  get interval(): number {
    return this.config.interval;
  }
  set interval(value: number) {
    this.setAttribute('interval', String(value));
  }

  get src(): string | null {
    return this.getAttribute('src');
  }
  set src(value: string | null) {
    if (value) {
      this.setAttribute('src', value);
    } else {
      this.removeAttribute('src');
    }
  }

  private shadow: ShadowRoot;
  private container: HTMLElement;
  private contentArea: HTMLElement;
  private config: ViewerConfig;
  private imageLoader: ImageLoader;
  private progressiveLoader: ProgressiveLoader;
  private toolbar: Toolbar | null = null;
  private loadingState: LoadingState = 'idle';
  private messages: I18nMessages;

  // 当前模式的查看器
  private singleViewer: ViewerSingle | null = null;
  private carouselViewer: ViewerCarousel | null = null;
  private slideshowViewer: ViewerSlideshow | null = null;
  private galleryViewer: ViewerGallery | null = null;

  // 文件信息面板
  private fileInfoPanel: FileInfoPanel | null = null;

  private images: LoadedImage[] = [];
  private currentIndex: number = 0;

  // 拖拽事件处理
  private boundDragOver: (e: DragEvent) => void;
  private boundDragLeave: (e: DragEvent) => void;
  private boundDrop: (e: DragEvent) => void;

  constructor() {
    super();

    this.shadow = this.attachShadow({ mode: 'open' });
    this.config = { ...DEFAULT_CONFIG };
    this.messages = getMessages(this.config.locale);
    this.imageLoader = new ImageLoader();
    this.progressiveLoader = new ProgressiveLoader(this.config.progressiveThreshold);

    // 注入样式
    const style = document.createElement('style');
    style.textContent = ALL_STYLES;
    this.shadow.appendChild(style);

    // 创建容器
    this.container = document.createElement('div');
    this.container.className = 'iv-container';

    this.contentArea = document.createElement('div');
    this.contentArea.className = 'iv-content';
    
    this.container.appendChild(this.contentArea);
    this.shadow.appendChild(this.container);

    // 绑定拖拽事件
    this.boundDragOver = this.handleDragOver.bind(this);
    this.boundDragLeave = this.handleDragLeave.bind(this);
    this.boundDrop = this.handleDrop.bind(this);

    // 转发 ViewerSingle 的变换事件，使其穿透 Shadow DOM
    this.contentArea.addEventListener('transform-change', ((e: CustomEvent) => {
      e.stopPropagation(); // 避免重复（虽然原事件不冒泡，但保险起见）
      this.dispatchEvent(new CustomEvent('transform-change', {
        detail: e.detail,
        bubbles: true,
        composed: true,
      }));
    }) as EventListener);
  }

  connectedCallback(): void {
    this.setupReadonly();
    this.setupToolbar();
    this.setupDragDrop();

    // 设置默认主题属性
    if (!this.hasAttribute('theme')) {
      this.setAttribute('theme', this.config.theme);
    }

    // 如果有 src 属性，自动加载
    const src = this.getAttribute('src');
    if (src) {
      this.loadFromSrcAttribute(src);
    }
  }

  disconnectedCallback(): void {
    this.destroyViewers();
    this.toolbar?.destroy();
    this.fileInfoPanel?.destroy();
    this.releaseImages();
    this.teardownDragDrop();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;

    switch (name) {
      case 'mode':
        if (newValue && ['single', 'carousel', 'slideshow', 'gallery'].includes(newValue)) {
          this.setMode(newValue as ViewMode);
        }
        break;
      case 'readonly':
        this.config.readonly = newValue !== null && newValue !== 'false';
        this.setupReadonly();
        this.toolbar?.update({ readonly: this.config.readonly });
        break;
      case 'src':
        if (newValue) this.loadFromSrcAttribute(newValue);
        break;
      case 'auto-play':
        this.config.autoPlay = newValue !== null && newValue !== 'false';
        break;
      case 'interval':
        this.config.interval = Number(newValue) || 3000;
        break;
      case 'theme':
        if (newValue) {
          this.config.theme = newValue as ThemeName;
          // CSS 会通过 :host([theme="..."]) 自动应用
        }
        break;
      case 'locale':
        if (newValue) {
          this.config.locale = newValue;
          this.messages = getMessages(newValue);
          this.toolbar?.update({ messages: this.messages });
          if (this.fileInfoPanel) {
            this.fileInfoPanel.updateMessages(this.messages);
          }
        }
        break;
    }
  }

  // ===== Public API =====

  /**
   * 打开图片
   */
  async open(sources: ImageSource | ImageSource[]): Promise<void> {
    const sourceArray = Array.isArray(sources) ? sources : [sources];
    
    this.showLoading();
    
    try {
      this.releaseImages();
      this.images = await this.imageLoader.loadAll(sourceArray, (loaded, total) => {
        this.updateLoadingProgress(loaded, total);
      });

      this.hideLoading();

      // 更新工具栏
      this.toolbar?.update({ hasMultiple: this.images.length > 1 });

      // 渲染当前模式
      this.currentIndex = 0;
      this.renderCurrentMode();

      this.dispatchEvent(
        new CustomEvent('image-load', {
          detail: { index: 0, image: this.images[0] },
          bubbles: true,
        })
      );
    } catch (error) {
      this.hideLoading();
      this.showError(error instanceof Error ? error.message : String(error));
      
      this.dispatchEvent(
        new CustomEvent('image-error', {
          detail: { index: 0, error },
          bubbles: true,
        })
      );
    }
  }

  /**
   * 通过文件选择器打开本地文件
   */
  openFileDialog(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*, image/vnd.adobe.photoshop, application/x-photoshop, application/psd';
    input.multiple = true;
    input.addEventListener('change', () => {
      console.log(input.files);
      if (input.files && input.files.length > 0) {
        const sources: ImageSource[] = Array.from(input.files).map((file) => ({
          type: 'file' as const,
          data: file,
          name: file.name,
          mimeType: file.type,
        }));
        this.open(sources);
      }
    });
    input.click();
  }

  /**
   * 设置预览模式
   */
  setMode(mode: ViewMode): void {
    if (this.config.mode === mode) return;
    this.config.mode = mode;
    this.renderCurrentMode();
    this.toolbar?.update({ currentMode: mode });
    this.dispatchEvent(
      new CustomEvent('mode-change', { detail: { mode }, bubbles: true })
    );
  }

  /**
   * 设置主题
   */
  setTheme(theme: ThemeName): void {
    this.config.theme = theme;
    this.setAttribute('theme', theme);
  }

  /**
   * 设置语言
   */
  setLocale(locale: string): void {
    this.config.locale = locale;
    this.setAttribute('locale', locale);
  }

  /**
   * 设置工具栏配置
   */
  setConfig(config: Partial<ViewerConfig>): void {
    Object.assign(this.config, config);
    if (config.theme) this.setAttribute('theme', config.theme);
    if (config.locale) {
      this.messages = getMessages(config.locale);
    }
    if (config.toolbar) {
      // 更新 container 的 toolbar-top 类
      this.container.classList.toggle(
        'iv-toolbar-top', 
        config.toolbar.position === 'top'
      );
    }
    this.toolbar?.update({
      toolbar: this.config.toolbar,
      messages: this.messages,
    });
  }

  /**
   * 获取当前配置
   */
  getConfig(): ViewerConfig {
    return { ...this.config };
  }

  /**
   * 获取已加载的图片信息
   */
  getImages(): LoadedImage[] {
    return [...this.images];
  }

  /**
   * 下载当前图片
   */
  downloadCurrent(): void {
    if (this.config.readonly) return;
    const image = this.images[this.currentIndex];
    if (!image) return;

    const a = document.createElement('a');
    a.href = image.blobUrl;
    a.download = image.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    this.destroyViewers();
    this.toolbar?.destroy();
    this.fileInfoPanel?.destroy();
    this.releaseImages();
    this.teardownDragDrop();
  }

  // ===== Private Methods =====

  private async loadFromSrcAttribute(src: string): Promise<void> {
    try {
      // 尝试解析为 JSON 数组
      let urls: string[];
      try {
        const parsed = JSON.parse(src);
        urls = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        urls = [src];
      }

      const sources: ImageSource[] = urls.map((url: string) => ({
        type: 'url' as const,
        data: url,
      }));

      await this.open(sources);
    } catch (error) {
      this.showError(`Failed to load: ${error}`);
    }
  }

  private setupReadonly(): void {
    if (this.config.readonly) {
      this.setAttribute('readonly', '');
      // 禁止右键菜单
      this.shadow.addEventListener('contextmenu', this.preventContextMenu);
    } else {
      this.shadow.removeEventListener('contextmenu', this.preventContextMenu);
    }
  }

  private preventContextMenu = (e: Event): void => {
    e.preventDefault();
  };

  private setupToolbar(): void {
    if (this.toolbar) this.toolbar.destroy();

    // 根据 toolbar position 设置容器类
    const position = this.config.toolbar.position || 'bottom';
    this.container.classList.toggle('iv-toolbar-top', position === 'top');

    this.fileInfoPanel = new FileInfoPanel(this.container, this.messages);

    this.toolbar = new Toolbar(this.container, {
      onRotateLeft: () => this.singleViewer?.getTransform().rotateLeft(),
      onRotateRight: () => this.singleViewer?.getTransform().rotateRight(),
      onFlipX: () => this.singleViewer?.getTransform().flipHorizontal(),
      onFlipY: () => this.singleViewer?.getTransform().flipVertical(),
      onZoomIn: () => this.singleViewer?.getTransform().zoomIn(),
      onZoomOut: () => this.singleViewer?.getTransform().zoomOut(),
      onResetZoom: () => this.singleViewer?.getTransform().reset(),
      onToggleMagnifier: (enabled) => {
        this.config.magnifier.enabled = enabled;
        if (enabled) {
          this.singleViewer?.getMagnifier().enable();
        } else {
          this.singleViewer?.getMagnifier().disable();
        }
      },
      onModeChange: (mode) => this.setMode(mode),
      onFullscreen: () => this.toggleFullscreen(),
      onDownload: () => this.downloadCurrent(),
      onPrev: () => this.goToPrev(),
      onNext: () => this.goToNext(),
      onInfo: () => {
        const image = this.images[this.currentIndex];
        if (image) {
          this.fileInfoPanel?.show(image);
        }
      },
    }, {
      readonly: this.config.readonly,
      hasMultiple: this.images.length > 1,
      currentMode: this.config.mode,
      magnifierEnabled: this.config.magnifier.enabled,
      toolbar: this.config.toolbar,
      messages: this.messages,
    });
  }

  // ===== 拖拽功能 =====

  private setupDragDrop(): void {
    this.contentArea.addEventListener('dragover', this.boundDragOver);
    this.contentArea.addEventListener('dragleave', this.boundDragLeave);
    this.contentArea.addEventListener('drop', this.boundDrop);
  }

  private teardownDragDrop(): void {
    this.contentArea.removeEventListener('dragover', this.boundDragOver);
    this.contentArea.removeEventListener('dragleave', this.boundDragLeave);
    this.contentArea.removeEventListener('drop', this.boundDrop);
  }

  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    this.contentArea.classList.add('iv-drop-active');
  }

  private handleDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    // 只在真正离开时移除样式
    const rect = this.contentArea.getBoundingClientRect();
    if (
      e.clientX <= rect.left || e.clientX >= rect.right ||
      e.clientY <= rect.top || e.clientY >= rect.bottom
    ) {
      this.contentArea.classList.remove('iv-drop-active');
    }
  }

  private handleDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.contentArea.classList.remove('iv-drop-active');

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    // 过滤图片文件
    const imageFiles = Array.from(files).filter(file => {
      if (file.type.startsWith('image/')) return true;
      // 检查扩展名
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif', 'ico', 'psd'].includes(ext);
    });

    if (imageFiles.length === 0) return;

    const sources: ImageSource[] = imageFiles.map(file => ({
      type: 'file' as const,
      data: file,
      name: file.name,
      mimeType: file.type,
    }));

    this.open(sources);
  }

  private renderCurrentMode(): void {
    this.destroyViewers();

    if (this.images.length === 0) return;

    const handleChange = (index: number) => {
      this.currentIndex = index;
      this.dispatchEvent(
        new CustomEvent('image-change', {
          detail: { index, image: this.images[index] },
          bubbles: true,
        })
      );
    };

    switch (this.config.mode) {
      case 'single': {
        this.singleViewer = new ViewerSingle(this.contentArea, {
          zoom: this.config.magnifier.zoom,
          radius: this.config.magnifier.radius,
          enabled: this.config.magnifier.enabled,
        });
        if (this.images[this.currentIndex]) {
          this.singleViewer.show(this.images[this.currentIndex]);
        }
        break;
      }
      case 'carousel': {
        this.carouselViewer = new ViewerCarousel(this.contentArea, handleChange);
        this.carouselViewer.setImages(this.images);
        if (this.config.autoPlay) {
          this.carouselViewer.startAutoPlay(this.config.interval);
        }
        break;
      }
      case 'slideshow': {
        this.slideshowViewer = new ViewerSlideshow(this.contentArea, handleChange);
        this.slideshowViewer.setImages(this.images);
        if (this.config.autoPlay) {
          this.slideshowViewer.startAutoPlay(this.config.interval);
        }
        break;
      }
      case 'gallery': {
        this.galleryViewer = new ViewerGallery(this.contentArea, handleChange);
        this.galleryViewer.setImages(this.images);
        break;
      }
    }
  }

  private goToPrev(): void {
    switch (this.config.mode) {
      case 'single':
        this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
        this.singleViewer?.show(this.images[this.currentIndex]);
        break;
      case 'carousel':
        this.carouselViewer?.prev();
        break;
      case 'slideshow':
        this.slideshowViewer?.prev();
        break;
    }
  }

  private goToNext(): void {
    switch (this.config.mode) {
      case 'single':
        this.currentIndex = (this.currentIndex + 1) % this.images.length;
        this.singleViewer?.show(this.images[this.currentIndex]);
        break;
      case 'carousel':
        this.carouselViewer?.next();
        break;
      case 'slideshow':
        this.slideshowViewer?.next();
        break;
    }
  }

  private toggleFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      this.requestFullscreen();
    }
  }

  private destroyViewers(): void {
    this.singleViewer?.destroy();
    this.singleViewer = null;
    this.carouselViewer?.destroy();
    this.carouselViewer = null;
    this.slideshowViewer?.destroy();
    this.slideshowViewer = null;
    this.galleryViewer?.destroy();
    this.galleryViewer = null;
    this.contentArea.innerHTML = '';
  }

  private releaseImages(): void {
    this.images.forEach((img) => {
      URL.revokeObjectURL(img.blobUrl);
    });
    this.images = [];
  }

  private showLoading(): void {
    this.loadingState = 'loading';
    this.contentArea.innerHTML = `
      <div class="iv-loading">
        <div class="iv-loading-spinner"></div>
        <span>${this.messages.loading}</span>
      </div>
    `;
  }

  private updateLoadingProgress(loaded: number, total: number): void {
    const span = this.contentArea.querySelector('.iv-loading span');
    if (span) {
      span.textContent = this.messages.loadingProgress
        .replace('{loaded}', String(loaded))
        .replace('{total}', String(total));
    }
  }

  private hideLoading(): void {
    this.loadingState = 'loaded';
    const loading = this.contentArea.querySelector('.iv-loading');
    if (loading) loading.remove();
  }

  private showError(message: string): void {
    this.loadingState = 'error';
    this.contentArea.innerHTML = `
      <div class="iv-error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <p>${message}</p>
      </div>
    `;
  }
}
