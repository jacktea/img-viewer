/**
 * 幻灯片模式 - 全屏淡入淡出展示
 */

import { LoadedImage } from '../types';

export class ViewerSlideshow {
  private container: HTMLElement;
  private viewport: HTMLElement;
  private counter: HTMLElement;
  private images: LoadedImage[] = [];
  private currentIndex: number = 0;
  private autoPlayTimer: ReturnType<typeof setInterval> | null = null;
  private slides: HTMLElement[] = [];
  private onChange?: (index: number) => void;

  constructor(container: HTMLElement, onChange?: (index: number) => void) {
    this.container = container;
    this.onChange = onChange;

    this.viewport = document.createElement('div');
    this.viewport.className = 'iv-slideshow-viewport';

    this.counter = document.createElement('div');
    this.counter.className = 'iv-slideshow-counter';

    // 进度条
    const progress = document.createElement('div');
    progress.className = 'iv-slideshow-progress';

    container.appendChild(this.viewport);
    container.appendChild(this.counter);
    container.appendChild(progress);

    // 键盘导航
    this.bindKeyboard();
    this.bindClick();
  }

  setImages(images: LoadedImage[]): void {
    this.images = images;
    this.currentIndex = 0;
    this.renderSlides();
    this.updateCounter();
  }

  goTo(index: number): void {
    if (index < 0) index = this.images.length - 1;
    if (index >= this.images.length) index = 0;

    // 淡出当前
    if (this.slides[this.currentIndex]) {
      this.slides[this.currentIndex].classList.remove('active');
    }

    this.currentIndex = index;

    // 淡入新图
    if (this.slides[this.currentIndex]) {
      this.slides[this.currentIndex].classList.add('active');
    }

    this.updateCounter();
    this.onChange?.(index);
  }

  prev(): void {
    this.goTo(this.currentIndex - 1);
  }

  next(): void {
    this.goTo(this.currentIndex + 1);
  }

  startAutoPlay(interval: number = 3000): void {
    this.stopAutoPlay();
    this.autoPlayTimer = setInterval(() => this.next(), interval);
  }

  stopAutoPlay(): void {
    if (this.autoPlayTimer) {
      clearInterval(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  private renderSlides(): void {
    this.viewport.innerHTML = '';
    this.slides = [];

    this.images.forEach((image, i) => {
      const slide = document.createElement('div');
      slide.className = `iv-slideshow-slide ${i === 0 ? 'active' : ''}`;
      
      const img = document.createElement('img');
      img.src = image.blobUrl;
      img.alt = image.name;
      img.draggable = false;
      
      slide.appendChild(img);
      this.viewport.appendChild(slide);
      this.slides.push(slide);
    });
  }

  private updateCounter(): void {
    this.counter.textContent = `${this.currentIndex + 1} / ${this.images.length}`;
  }

  private bindKeyboard(): void {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.prev();
      else if (e.key === 'ArrowRight') this.next();
      else if (e.key === 'Escape') this.stopAutoPlay();
    });
  }

  private bindClick(): void {
    this.viewport.addEventListener('click', (e) => {
      const rect = this.viewport.getBoundingClientRect();
      const x = (e as MouseEvent).clientX - rect.left;
      if (x < rect.width / 2) this.prev();
      else this.next();
    });
  }

  destroy(): void {
    this.stopAutoPlay();
    this.container.innerHTML = '';
  }
}
