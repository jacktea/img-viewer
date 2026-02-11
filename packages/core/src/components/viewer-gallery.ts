/**
 * 相册模式 - 缩略图网格 + 大图查看
 */

import { LoadedImage } from '../types';

export class ViewerGallery {
  private container: HTMLElement;
  private grid: HTMLElement;
  private lightbox: HTMLElement;
  private lightboxImg: HTMLImageElement;
  private lightboxCounter: HTMLElement;
  private images: LoadedImage[] = [];
  private currentIndex: number = 0;
  private isLightboxOpen: boolean = false;
  private onChange?: (index: number) => void;

  constructor(container: HTMLElement, onChange?: (index: number) => void) {
    this.container = container;
    this.onChange = onChange;

    // 缩略图网格
    this.grid = document.createElement('div');
    this.grid.className = 'iv-gallery-grid';

    // 大图浮层
    this.lightbox = document.createElement('div');
    this.lightbox.className = 'iv-gallery-lightbox';
    this.lightbox.innerHTML = `
      <div class="iv-gallery-lightbox-backdrop"></div>
      <div class="iv-gallery-lightbox-content">
        <button class="iv-gallery-lightbox-close">&times;</button>
        <button class="iv-gallery-lightbox-prev">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15,18 9,12 15,6"/></svg>
        </button>
        <img class="iv-gallery-lightbox-img" draggable="false" />
        <button class="iv-gallery-lightbox-next">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg>
        </button>
        <div class="iv-gallery-lightbox-counter"></div>
      </div>
    `;

    this.lightboxImg = this.lightbox.querySelector('.iv-gallery-lightbox-img')!;
    this.lightboxCounter = this.lightbox.querySelector('.iv-gallery-lightbox-counter')!;

    container.appendChild(this.grid);
    container.appendChild(this.lightbox);

    this.bindLightboxEvents();
  }

  setImages(images: LoadedImage[]): void {
    this.images = images;
    this.renderGrid();
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  private renderGrid(): void {
    this.grid.innerHTML = '';

    this.images.forEach((image, i) => {
      const item = document.createElement('div');
      item.className = 'iv-gallery-item';
      
      const img = document.createElement('img');
      img.src = image.blobUrl;
      img.alt = image.name;
      img.draggable = false;
      img.loading = 'lazy';

      const overlay = document.createElement('div');
      overlay.className = 'iv-gallery-item-overlay';
      overlay.innerHTML = `<span>${image.name}</span>`;

      item.appendChild(img);
      item.appendChild(overlay);
      item.addEventListener('click', () => this.openLightbox(i));
      this.grid.appendChild(item);
    });
  }

  private openLightbox(index: number): void {
    this.currentIndex = index;
    this.isLightboxOpen = true;
    this.updateLightbox();
    this.lightbox.classList.add('active');
    this.onChange?.(index);
  }

  private closeLightbox(): void {
    this.isLightboxOpen = false;
    this.lightbox.classList.remove('active');
  }

  private updateLightbox(): void {
    const image = this.images[this.currentIndex];
    if (image) {
      this.lightboxImg.src = image.blobUrl;
      this.lightboxImg.alt = image.name;
      this.lightboxCounter.textContent = `${this.currentIndex + 1} / ${this.images.length}`;
    }
  }

  private lightboxPrev(): void {
    this.currentIndex = this.currentIndex > 0 ? this.currentIndex - 1 : this.images.length - 1;
    this.updateLightbox();
    this.onChange?.(this.currentIndex);
  }

  private lightboxNext(): void {
    this.currentIndex = this.currentIndex < this.images.length - 1 ? this.currentIndex + 1 : 0;
    this.updateLightbox();
    this.onChange?.(this.currentIndex);
  }

  private bindLightboxEvents(): void {
    this.lightbox.querySelector('.iv-gallery-lightbox-close')!
      .addEventListener('click', () => this.closeLightbox());
    this.lightbox.querySelector('.iv-gallery-lightbox-backdrop')!
      .addEventListener('click', () => this.closeLightbox());
    this.lightbox.querySelector('.iv-gallery-lightbox-prev')!
      .addEventListener('click', (e) => { e.stopPropagation(); this.lightboxPrev(); });
    this.lightbox.querySelector('.iv-gallery-lightbox-next')!
      .addEventListener('click', (e) => { e.stopPropagation(); this.lightboxNext(); });

    // 键盘
    document.addEventListener('keydown', (e) => {
      if (!this.isLightboxOpen) return;
      if (e.key === 'Escape') this.closeLightbox();
      else if (e.key === 'ArrowLeft') this.lightboxPrev();
      else if (e.key === 'ArrowRight') this.lightboxNext();
    });
  }

  destroy(): void {
    this.container.innerHTML = '';
  }
}
