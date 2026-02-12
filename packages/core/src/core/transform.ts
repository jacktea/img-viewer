/**
 * 图片变换管理 - 旋转、翻转、缩放
 */

import { TransformState, DEFAULT_TRANSFORM } from '../types';

export class TransformManager {
  private state: TransformState;
  private onChange?: (state: TransformState) => void;

  constructor(onChange?: (state: TransformState) => void) {
    this.state = { ...DEFAULT_TRANSFORM };
    this.onChange = onChange;
  }

  get current(): TransformState {
    return { ...this.state };
  }

  /**
   * 旋转（顺时针）
   */
  rotateRight(): void {
    this.state.rotation += 90;
    this.notify();
  }

  /**
   * 旋转（逆时针）
   */
  rotateLeft(): void {
    this.state.rotation -= 90;
    this.notify();
  }

  /**
   * 水平翻转
   */
  flipHorizontal(): void {
    this.state.flipX = !this.state.flipX;
    this.notify();
  }

  /**
   * 垂直翻转
   */
  flipVertical(): void {
    this.state.flipY = !this.state.flipY;
    this.notify();
  }

  /**
   * 设置缩放
   */
  setScale(scale: number): void {
    this.state.scale = Math.max(0.1, Math.min(10, scale));
    this.notify();
  }

  /**
   * 放大
   */
  zoomIn(step: number = 0.25): void {
    this.setScale(this.state.scale + step);
  }

  /**
   * 缩小
   */
  zoomOut(step: number = 0.25): void {
    this.setScale(this.state.scale - step);
  }

  /**
   * 设置偏移
   */
  setOffset(x: number, y: number): void {
    this.state.offsetX = x;
    this.state.offsetY = y;
    this.notify();
  }

  /**
   * 重置所有变换
   */
  reset(): void {
    this.state = { ...DEFAULT_TRANSFORM };
    this.notify();
  }

  /**
   * 生成 CSS transform 字符串
   */
  toCSSTransform(): string {
    const { rotation, flipX, flipY, scale, offsetX, offsetY } = this.state;
    const parts: string[] = [];

    // Use 3D transforms to trigger hardware acceleration
    parts.push(`translate3d(${offsetX}px, ${offsetY}px, 0)`);
    parts.push(`scale3d(${flipX ? -scale : scale}, ${flipY ? -scale : scale}, 1)`);
    
    if (rotation !== 0) {
      parts.push(`rotate(${rotation}deg)`); // Standard rotate is fine, or use rotate3d(0, 0, 1, deg)
    }

    return parts.join(' ');
  }

  private notify(): void {
    this.onChange?.({ ...this.state });
  }
}
