/**
 * 截图工具 - 支持矩形、圆形、自由涂鸦闭环选区
 */

import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';

export type ScreenshotTool = 'rect' | 'circle' | 'freehand';

interface Point {
  x: number;
  y: number;
}

export class Screenshot {
  private overlay: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private toolbar: HTMLElement;
  private active = false;
  private tool: ScreenshotTool = 'rect';
  private drawing = false;

  // 选区数据
  private startPoint: Point = { x: 0, y: 0 };
  private endPoint: Point = { x: 0, y: 0 };
  private freehandPoints: Point[] = [];
  private hasSelection = false;

  // 当前图片引用
  private imageElement: HTMLImageElement | null = null;
  private imageScale = 1;
  private imageOffsetX = 0;
  private imageOffsetY = 0;

  private onDeactivate?: () => void;

  constructor(onDeactivate?: () => void) {
    this.overlay = document.getElementById('screenshot-overlay') as HTMLCanvasElement;
    this.ctx = this.overlay.getContext('2d')!;
    this.toolbar = document.getElementById('screenshot-toolbar')!;
    this.onDeactivate = onDeactivate;

    this.bindEvents();
  }

  /**
   * 进入截图模式
   */
  activate(): void {
    this.active = true;
    this.hasSelection = false;
    this.resizeOverlay();
    this.overlay.style.display = 'block';
    this.toolbar.style.display = 'flex';
    this.clearCanvas();
  }

  /**
   * 退出截图模式
   */
  deactivate(): void {
    this.active = false;
    this.hasSelection = false;
    this.drawing = false;
    this.overlay.style.display = 'none';
    this.toolbar.style.display = 'none';
    this.onDeactivate?.();
  }

  isActive(): boolean {
    return this.active;
  }

  /**
   * 设置当前图片信息
   */
  setImage(
    img: HTMLImageElement | null,
    scale: number,
    offsetX: number,
    offsetY: number
  ): void {
    this.imageElement = img;
    this.imageScale = scale;
    this.imageOffsetX = offsetX;
    this.imageOffsetY = offsetY;
  }

  private resizeOverlay(): void {
    const parent = this.overlay.parentElement!;
    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.overlay.width = rect.width * dpr;
    this.overlay.height = rect.height * dpr;
    this.overlay.style.width = `${rect.width}px`;
    this.overlay.style.height = `${rect.height}px`;
    this.ctx.scale(dpr, dpr);
  }

  private clearCanvas(): void {
    const w = this.overlay.clientWidth;
    const h = this.overlay.clientHeight;
    this.ctx.clearRect(0, 0, w, h);
  }

  private bindEvents(): void {
    // 工具选择
    this.toolbar.querySelectorAll('[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.tool = btn.getAttribute('data-tool') as ScreenshotTool;
        this.toolbar.querySelectorAll('.stool-btn[data-tool]').forEach(b =>
          b.classList.toggle('active', b === btn)
        );
        this.hasSelection = false;
        this.clearCanvas();
      });
    });

    // 保存按钮
    document.getElementById('btn-screenshot-save')!.addEventListener('click', () => {
      this.saveScreenshot();
    });

    // 取消按钮
    document.getElementById('btn-screenshot-cancel')!.addEventListener('click', () => {
      this.deactivate();
    });

    // 鼠标事件
    this.overlay.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.overlay.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.overlay.addEventListener('mouseup', (e) => this.onMouseUp(e));
  }

  private getCanvasPoint(e: MouseEvent): Point {
    const rect = this.overlay.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private onMouseDown(e: MouseEvent): void {
    if (!this.active || e.button !== 0) return;
    this.drawing = true;
    this.hasSelection = false;
    const pt = this.getCanvasPoint(e);
    this.startPoint = pt;
    this.endPoint = pt;
    this.freehandPoints = [pt];
    this.clearCanvas();
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.drawing) return;
    const pt = this.getCanvasPoint(e);
    this.endPoint = pt;

    if (this.tool === 'freehand') {
      this.freehandPoints.push(pt);
    }

    this.clearCanvas();
    this.drawSelection();
  }

  private onMouseUp(_e: MouseEvent): void {
    if (!this.drawing) return;
    this.drawing = false;
    this.hasSelection = true;

    // 自由绘制模式自动闭合
    if (this.tool === 'freehand' && this.freehandPoints.length > 2) {
      this.freehandPoints.push(this.freehandPoints[0]);
    }

    this.clearCanvas();
    this.drawSelection();
  }

  private drawSelection(): void {
    const ctx = this.ctx;
    const w = this.overlay.clientWidth;
    const h = this.overlay.clientHeight;

    // 半透明遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, w, h);

    // 清除选区（让选区内透明）
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';

    if (this.tool === 'rect') {
      const x = Math.min(this.startPoint.x, this.endPoint.x);
      const y = Math.min(this.startPoint.y, this.endPoint.y);
      const rw = Math.abs(this.endPoint.x - this.startPoint.x);
      const rh = Math.abs(this.endPoint.y - this.startPoint.y);
      ctx.fillRect(x, y, rw, rh);
    } else if (this.tool === 'circle') {
      const cx = (this.startPoint.x + this.endPoint.x) / 2;
      const cy = (this.startPoint.y + this.endPoint.y) / 2;
      const rx = Math.abs(this.endPoint.x - this.startPoint.x) / 2;
      const ry = Math.abs(this.endPoint.y - this.startPoint.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.tool === 'freehand' && this.freehandPoints.length > 1) {
      ctx.beginPath();
      ctx.moveTo(this.freehandPoints[0].x, this.freehandPoints[0].y);
      for (let i = 1; i < this.freehandPoints.length; i++) {
        ctx.lineTo(this.freehandPoints[i].x, this.freehandPoints[i].y);
      }
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();

    // 绘制选区边框
    ctx.strokeStyle = '#6c63ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);

    if (this.tool === 'rect') {
      const x = Math.min(this.startPoint.x, this.endPoint.x);
      const y = Math.min(this.startPoint.y, this.endPoint.y);
      const rw = Math.abs(this.endPoint.x - this.startPoint.x);
      const rh = Math.abs(this.endPoint.y - this.startPoint.y);
      ctx.strokeRect(x, y, rw, rh);
    } else if (this.tool === 'circle') {
      const cx = (this.startPoint.x + this.endPoint.x) / 2;
      const cy = (this.startPoint.y + this.endPoint.y) / 2;
      const rx = Math.abs(this.endPoint.x - this.startPoint.x) / 2;
      const ry = Math.abs(this.endPoint.y - this.startPoint.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.tool === 'freehand' && this.freehandPoints.length > 1) {
      ctx.beginPath();
      ctx.moveTo(this.freehandPoints[0].x, this.freehandPoints[0].y);
      for (let i = 1; i < this.freehandPoints.length; i++) {
        ctx.lineTo(this.freehandPoints[i].x, this.freehandPoints[i].y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    ctx.setLineDash([]);
  }

  /**
   * 保存截图 - 弹出格式选择和保存对话框
   */
  private async saveScreenshot(): Promise<void> {
    if (!this.hasSelection || !this.imageElement) {
        // 使用简单的 alert 提示，或者后续集成 Toast
        alert('请先框选截图区域');
        return;
    }

    // 显示格式选择对话框
    const format = await this.showFormatDialog();
    if (!format) return;

    try {
      // 裁剪选区
      const croppedData = this.cropSelection();
      if (!croppedData) return;

      // 选择保存路径
      const ext = format === 'jpg' ? 'jpeg' : format;
      const savePath = await save({
        defaultPath: `screenshot.${format}`,
        filters: [{
          name: format.toUpperCase(),
          extensions: [format === 'jpg' ? 'jpg' : format],
        }],
      });

      if (!savePath) return;

      // 调用 Rust 后端保存
      await invoke('save_screenshot', {
        base64Data: croppedData,
        savePath,
        format,
      });

      this.deactivate();
    } catch (err) {
      console.error('保存截图失败:', err);
    }
  }

  /**
   * 裁剪选区内的图片
   */
  private cropSelection(): string | null {
    if (!this.imageElement) return null;

    const img = this.imageElement;
    const overlayRect = this.overlay.getBoundingClientRect();

    // 计算图片在 overlay 中的位置
    const viewerWrapper = document.getElementById('viewer-wrapper')!;
    const wrapperRect = viewerWrapper.getBoundingClientRect();
    const imgDisplay = viewerWrapper.querySelector('.iv-single-image') as HTMLImageElement | null;

    // 获取图片显示区域
    let imgRect: DOMRect;
    if (imgDisplay) {
      imgRect = imgDisplay.getBoundingClientRect();
    } else {
      // fallback: 假设图片居中显示
      const imgW = img.naturalWidth * this.imageScale;
      const imgH = img.naturalHeight * this.imageScale;
      imgRect = new DOMRect(
        wrapperRect.left + (wrapperRect.width - imgW) / 2 + this.imageOffsetX,
        wrapperRect.top + (wrapperRect.height - imgH) / 2 + this.imageOffsetY,
        imgW, imgH
      );
    }

    // 创建离屏 canvas 绘制裁剪结果
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    if (this.tool === 'rect') {
      const sx = Math.min(this.startPoint.x, this.endPoint.x);
      const sy = Math.min(this.startPoint.y, this.endPoint.y);
      const sw = Math.abs(this.endPoint.x - this.startPoint.x);
      const sh = Math.abs(this.endPoint.y - this.startPoint.y);

      canvas.width = sw;
      canvas.height = sh;

      // 将选区映射到图片原始坐标
      const scaleX = img.naturalWidth / imgRect.width;
      const scaleY = img.naturalHeight / imgRect.height;
      const imgRelX = (sx + overlayRect.left - imgRect.left) * scaleX;
      const imgRelY = (sy + overlayRect.top - imgRect.top) * scaleY;

      ctx.drawImage(
        img,
        imgRelX, imgRelY, sw * scaleX, sh * scaleY,
        0, 0, sw, sh
      );
    } else if (this.tool === 'circle') {
      const cx = (this.startPoint.x + this.endPoint.x) / 2;
      const cy = (this.startPoint.y + this.endPoint.y) / 2;
      const rx = Math.abs(this.endPoint.x - this.startPoint.x) / 2;
      const ry = Math.abs(this.endPoint.y - this.startPoint.y) / 2;

      canvas.width = rx * 2;
      canvas.height = ry * 2;

      // 椭圆裁剪
      ctx.beginPath();
      ctx.ellipse(rx, ry, rx, ry, 0, 0, Math.PI * 2);
      ctx.clip();

      const scaleX = img.naturalWidth / imgRect.width;
      const scaleY = img.naturalHeight / imgRect.height;
      const imgRelX = (cx - rx + overlayRect.left - imgRect.left) * scaleX;
      const imgRelY = (cy - ry + overlayRect.top - imgRect.top) * scaleY;

      ctx.drawImage(
        img,
        imgRelX, imgRelY, rx * 2 * scaleX, ry * 2 * scaleY,
        0, 0, rx * 2, ry * 2
      );
    } else if (this.tool === 'freehand' && this.freehandPoints.length > 2) {
      // 计算包围盒
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const pt of this.freehandPoints) {
        minX = Math.min(minX, pt.x);
        minY = Math.min(minY, pt.y);
        maxX = Math.max(maxX, pt.x);
        maxY = Math.max(maxY, pt.y);
      }

      const w = maxX - minX;
      const h = maxY - minY;
      canvas.width = w;
      canvas.height = h;

      // 自由路径裁剪
      ctx.beginPath();
      ctx.moveTo(this.freehandPoints[0].x - minX, this.freehandPoints[0].y - minY);
      for (let i = 1; i < this.freehandPoints.length; i++) {
        ctx.lineTo(this.freehandPoints[i].x - minX, this.freehandPoints[i].y - minY);
      }
      ctx.closePath();
      ctx.clip();

      const scaleX = img.naturalWidth / imgRect.width;
      const scaleY = img.naturalHeight / imgRect.height;
      const imgRelX = (minX + overlayRect.left - imgRect.left) * scaleX;
      const imgRelY = (minY + overlayRect.top - imgRect.top) * scaleY;

      ctx.drawImage(
        img,
        imgRelX, imgRelY, w * scaleX, h * scaleY,
        0, 0, w, h
      );
    }

    return canvas.toDataURL('image/png');
  }

  /**
   * 显示格式选择对话框
   */
  private showFormatDialog(): Promise<string | null> {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'save-dialog-overlay';

      const dialog = document.createElement('div');
      dialog.className = 'save-dialog';
      dialog.innerHTML = `
        <h3>保存截图</h3>
        <div class="format-options">
          <button class="format-btn active" data-fmt="png">PNG</button>
          <button class="format-btn" data-fmt="jpg">JPG</button>
          <button class="format-btn" data-fmt="webp">WebP</button>
        </div>
        <div class="save-dialog-actions">
          <button class="btn-cancel">取消</button>
          <button class="btn-save">保存</button>
        </div>
      `;

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      let selectedFormat = 'png';

      dialog.querySelectorAll('.format-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          dialog.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          selectedFormat = btn.getAttribute('data-fmt')!;
        });
      });

      dialog.querySelector('.btn-cancel')!.addEventListener('click', () => {
        overlay.remove();
        resolve(null);
      });

      dialog.querySelector('.btn-save')!.addEventListener('click', () => {
        overlay.remove();
        resolve(selectedFormat);
      });

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.remove();
          resolve(null);
        }
      });
    });
  }
}
