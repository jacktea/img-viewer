/**
 * 侧边栏文件列表组件
 */

export interface SidebarFile {
  path: string;
  name: string;
  size: number;
  thumbnail?: string; // base64 thumbnail
}

export interface SidebarEvents {
  onSelect: (file: SidebarFile, index: number) => void;
  onLoadThumbnail: (index: number) => Promise<string>;
}

export class Sidebar {
  private listEl: HTMLElement;
  private countEl: HTMLElement;
  private files: SidebarFile[] = [];
  private activeIndex = -1;
  private events: SidebarEvents;
  private observer: IntersectionObserver;
  private loadedThumbnails = new Set<number>();

  constructor(events: SidebarEvents) {
    this.listEl = document.getElementById('sidebar-list')!;
    this.countEl = document.getElementById('sidebar-count')!;
    this.events = events;

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = Number(entry.target.getAttribute('data-index'));
          this.loadThumbnailIfNeeded(index);
        }
      });
    }, { root: this.listEl, rootMargin: '100px' });
  }

  /**
   * 设置文件列表
   */
  setFiles(files: SidebarFile[]): void {
    this.files = files;
    this.countEl.textContent = String(files.length);
    this.loadedThumbnails.clear();
    this.render();
  }

  /**
   * 仅更新内存中的缩略图数据（不强制重绘dom，由懒加载控制）
   */
  updateThumbnailData(index: number, base64: string): void {
    if (this.files[index]) {
      this.files[index].thumbnail = base64;
      // 如果当前 DOM 存在且图片未显示，更新之
      const img = this.listEl.querySelector(
        `[data-index="${index}"] .sidebar-thumb`
      ) as HTMLImageElement | null;
      if (img && !img.src) {
        img.src = base64;
      }
    }
  }

  /**
   * 设置当前选中
   */
  setActive(index: number): void {
    this.activeIndex = index;
    this.listEl.querySelectorAll('.sidebar-item').forEach((el, i) => {
      el.classList.toggle('active', i === index);
    });
    const activeEl = this.listEl.querySelector('.sidebar-item.active');
    activeEl?.scrollIntoView({ block: 'nearest' });
  }

  /**
   * 格式化文件大小
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
  }

  private render(): void {
    this.observer.disconnect();
    this.listEl.innerHTML = '';

    const fragment = document.createDocumentFragment();

    this.files.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = `sidebar-item${index === this.activeIndex ? ' active' : ''}`;
      item.setAttribute('data-index', String(index));

      const thumb = document.createElement('img');
      thumb.className = 'sidebar-thumb';
      // 如果已有缩略图数据则直接显示，否则留空等待懒加载
      if (file.thumbnail) {
        thumb.src = file.thumbnail;
        this.loadedThumbnails.add(index);
      }
      thumb.alt = file.name;

      const nameEl = document.createElement('span');
      nameEl.className = 'sidebar-name';
      nameEl.textContent = file.name;
      nameEl.title = file.name;

      const sizeEl = document.createElement('span');
      sizeEl.className = 'sidebar-size';
      sizeEl.textContent = this.formatSize(file.size);

      item.appendChild(thumb);
      item.appendChild(nameEl);
      item.appendChild(sizeEl);

      item.addEventListener('click', () => {
        this.setActive(index);
        this.events.onSelect(file, index);
      });

      fragment.appendChild(item);
      this.observer.observe(item);
    });

    this.listEl.appendChild(fragment);
  }

  private async loadThumbnailIfNeeded(index: number) {
    if (this.loadedThumbnails.has(index)) return;
    
    this.queue.push(index);
    this.processQueue();
  }

  private queue: number[] = [];
  private activeRequests = 0;
  private MAX_CONCURRENT = 2; // 限制并发数为 2，避免阻塞主线程

  private async processQueue() {
    if (this.activeRequests >= this.MAX_CONCURRENT || this.queue.length === 0) return;

    const index = this.queue.shift();
    if (index === undefined) return;

    this.activeRequests++;
    this.loadedThumbnails.add(index); // 标记为处理中

    try {
      const base64 = await this.events.onLoadThumbnail(index);
      this.updateThumbnailData(index, base64);
    } catch {
      // 失败可重试？或者只是移除标记允许再次尝试
      this.loadedThumbnails.delete(index);
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }
}
