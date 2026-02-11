/**
 * 单图查看器 - 显示单张图片，支持拖拽平移和滚轮缩放
 */

import { LoadedImage, TransformState } from '../types';
import { TransformManager } from '../core/transform';
import { Magnifier } from './magnifier';

export class ViewerSingle {
  private container: HTMLElement;
  private wrapper: HTMLElement;
  private imgElement: HTMLImageElement;
  private transform: TransformManager;
  private magnifier: Magnifier;
  private currentImage: LoadedImage | null = null;

  // 拖拽状态
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private lastOffsetX = 0;
  private lastOffsetY = 0;

  constructor(
    container: HTMLElement,
    magnifierOptions?: { zoom?: number; radius?: number; enabled?: boolean }
  ) {
    this.container = container;

    // 创建包装层
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'iv-single-wrapper';

    this.imgElement = document.createElement('img');
    this.imgElement.className = 'iv-single-image';
    this.imgElement.draggable = false;

    this.wrapper.appendChild(this.imgElement);
    container.appendChild(this.wrapper);

    // 变换管理
    this.transform = new TransformManager((state) => {
      this.applyTransform(state);
    });

    // 放大镜
    this.magnifier = new Magnifier(this.wrapper, magnifierOptions);

    // 绑定事件
    this.bindEvents();
  }

  /**
   * 显示图片
   */
  show(image: LoadedImage): void {
    this.currentImage = image;
    this.imgElement.src = image.blobUrl;
    this.imgElement.alt = image.name;
    this.magnifier.setImage(this.imgElement);
    this.transform.reset();
    this.container.classList.add('iv-has-image');
  }

  getTransform(): TransformManager {
    return this.transform;
  }

  getMagnifier(): Magnifier {
    return this.magnifier;
  }

  getImageElement(): HTMLImageElement {
    return this.imgElement;
  }

  private applyTransform(state: TransformState): void {
    this.imgElement.style.transform = this.transform.toCSSTransform();
    // 触发自定义事件
    this.container.dispatchEvent(
      new CustomEvent('transform-change', { detail: { transform: state } })
    );
  }

  private bindEvents(): void {
    // 鼠标滚轮缩放
    this.wrapper.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        this.transform.zoomIn(0.1);
      } else {
        this.transform.zoomOut(0.1);
      }
    }, { passive: false });

    // 拖拽平移
    this.wrapper.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      const current = this.transform.current;
      this.lastOffsetX = current.offsetX;
      this.lastOffsetY = current.offsetY;
      this.wrapper.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;
      this.transform.setOffset(this.lastOffsetX + dx, this.lastOffsetY + dy);
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.wrapper.style.cursor = '';
      }
    });

    // 触摸支持（移动端缩放/拖拽）
    let lastTouchDistance = 0;
    this.wrapper.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.dragStartX = e.touches[0].clientX;
        this.dragStartY = e.touches[0].clientY;
        const current = this.transform.current;
        this.lastOffsetX = current.offsetX;
        this.lastOffsetY = current.offsetY;
      } else if (e.touches.length === 2) {
        lastTouchDistance = this.getTouchDistance(e.touches);
      }
    }, { passive: true });

    this.wrapper.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && this.isDragging) {
        const dx = e.touches[0].clientX - this.dragStartX;
        const dy = e.touches[0].clientY - this.dragStartY;
        this.transform.setOffset(this.lastOffsetX + dx, this.lastOffsetY + dy);
      } else if (e.touches.length === 2) {
        const distance = this.getTouchDistance(e.touches);
        const scale = distance / lastTouchDistance;
        const current = this.transform.current;
        this.transform.setScale(current.scale * scale);
        lastTouchDistance = distance;
      }
    }, { passive: false });

    this.wrapper.addEventListener('touchend', () => {
      this.isDragging = false;
      lastTouchDistance = 0;
    });

    // 双击重置
    this.wrapper.addEventListener('dblclick', () => {
      this.transform.reset();
    });
  }

  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  destroy(): void {
    this.magnifier.destroy();
    // URL.revokeObjectURL 由 ImgViewerElement 统一管理，子组件不应释放
    this.wrapper.remove();
  }
}
