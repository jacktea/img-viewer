/**
 * 轮播图模式 - 水平滑动切换，带指示器
 *
 * 首尾衔接采用"克隆哨兵"方案：
 * Track 布局:
 *   [clone-last] [real-0] [real-1] ... [real-n-1] [clone-first]
 *   trackPos: 0      1        2    ...     n          n+1
 */

import { LoadedImage } from '../types';

export class ViewerCarousel {
  private container: HTMLElement;
  private track: HTMLElement;
  private indicators: HTMLElement;
  private images: LoadedImage[] = [];
  /** 当前逻辑索引（0-based，对应真实图片） */
  private currentIndex: number = 0;
  /** 当前 track 中的位置（含哨兵偏移，1-based 为第一张真实图） */
  private trackPos: number = 1;
  private autoPlayTimer: ReturnType<typeof setInterval> | null = null;
  private onChange?: (index: number) => void;

  constructor(container: HTMLElement, onChange?: (index: number) => void) {
    this.container = container;
    this.onChange = onChange;

    this.track = document.createElement('div');
    this.track.className = 'iv-carousel-track';

    this.indicators = document.createElement('div');
    this.indicators.className = 'iv-carousel-indicators';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'iv-carousel-arrow iv-carousel-prev';
    prevBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15,18 9,12 15,6"/></svg>`;
    prevBtn.addEventListener('click', () => this.prev());

    const nextBtn = document.createElement('button');
    nextBtn.className = 'iv-carousel-arrow iv-carousel-next';
    nextBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg>`;
    nextBtn.addEventListener('click', () => this.next());

    const wrapper = document.createElement('div');
    wrapper.className = 'iv-carousel-wrapper';
    wrapper.appendChild(prevBtn);
    wrapper.appendChild(this.track);
    wrapper.appendChild(nextBtn);

    container.appendChild(wrapper);
    container.appendChild(this.indicators);

    this.track.addEventListener('transitionend', () => {
      this.onTransitionEnd();
    });

    this.bindSwipe(wrapper);
  }

  setImages(images: LoadedImage[]): void {
    this.images = images;
    this.currentIndex = 0;
    this.trackPos = 1;
    this.renderSlides();
    this.renderIndicators();
    this.moveTo(this.trackPos, false);
  }

  goTo(index: number): void {
    this.snapIfNeeded();
    this.currentIndex = index;
    this.trackPos = index + 1;
    this.moveTo(this.trackPos, true);
    this.updateIndicators();
    this.onChange?.(this.currentIndex);
  }

  prev(): void {
    this.snapIfNeeded();
    this.trackPos--;
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    this.moveTo(this.trackPos, true);
    this.updateIndicators();
    this.onChange?.(this.currentIndex);
  }

  next(): void {
    this.snapIfNeeded();
    this.trackPos++;
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
    this.moveTo(this.trackPos, true);
    this.updateIndicators();
    this.onChange?.(this.currentIndex);
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

  // ===== private =====

  /**
   * 如果当前停在哨兵位，立即（无动画）跳转到真实位置。
   * 这样快速点击时，新的动画从正确的位置开始。
   */
  private snapIfNeeded(): void {
    const n = this.images.length;
    if (this.trackPos === 0) {
      this.trackPos = n;
      this.moveTo(this.trackPos, false);
    } else if (this.trackPos === n + 1) {
      this.trackPos = 1;
      this.moveTo(this.trackPos, false);
    }
  }

  private renderSlides(): void {
    this.track.innerHTML = '';
    if (this.images.length === 0) return;

    this.track.appendChild(this.createSlide(this.images[this.images.length - 1]));
    this.images.forEach((image) => {
      this.track.appendChild(this.createSlide(image));
    });
    this.track.appendChild(this.createSlide(this.images[0]));
  }

  private createSlide(image: LoadedImage): HTMLElement {
    const slide = document.createElement('div');
    slide.className = 'iv-carousel-slide';
    const img = document.createElement('img');
    img.src = image.blobUrl;
    img.alt = image.name;
    img.draggable = false;
    slide.appendChild(img);
    return slide;
  }

  private renderIndicators(): void {
    this.indicators.innerHTML = '';
    this.images.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = `iv-carousel-dot ${i === this.currentIndex ? 'active' : ''}`;
      dot.addEventListener('click', () => this.goTo(i));
      this.indicators.appendChild(dot);
    });
  }

  private moveTo(trackPos: number, animate: boolean): void {
    if (animate) {
      this.track.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    } else {
      this.track.style.transition = 'none';
    }
    this.track.style.transform = `translateX(-${trackPos * 100}%)`;

    if (!animate) {
      // 强制重排确保瞬移生效
      void this.track.offsetHeight;
    }
  }

  private onTransitionEnd(): void {
    const n = this.images.length;
    if (this.trackPos === 0) {
      this.trackPos = n;
      this.moveTo(this.trackPos, false);
    } else if (this.trackPos === n + 1) {
      this.trackPos = 1;
      this.moveTo(this.trackPos, false);
    }
  }

  private updateIndicators(): void {
    const dots = this.indicators.querySelectorAll('.iv-carousel-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === this.currentIndex);
    });
  }

  private bindSwipe(element: HTMLElement): void {
    let startX = 0;
    let startY = 0;

    element.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });

    element.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;

      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
        if (dx > 0) this.prev();
        else this.next();
      }
    });
  }

  destroy(): void {
    this.stopAutoPlay();
    this.container.innerHTML = '';
  }
}
