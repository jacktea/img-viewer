/**
 * 标尺组件 - 显示水平/垂直刻度，跟随图片缩放平移同步
 */

export class Ruler {
  private container: HTMLElement;
  private hCanvas: HTMLCanvasElement;
  private vCanvas: HTMLCanvasElement;
  private hCtx: CanvasRenderingContext2D;
  private vCtx: CanvasRenderingContext2D;
  private visible = false;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private imageWidth = 0;
  private imageHeight = 0;
  private resizeObserver: ResizeObserver;

  constructor() {
    this.container = document.getElementById('ruler-container')!;
    this.hCanvas = document.getElementById('ruler-h') as HTMLCanvasElement;
    this.vCanvas = document.getElementById('ruler-v') as HTMLCanvasElement;
    this.hCtx = this.hCanvas.getContext('2d')!;
    this.vCtx = this.vCanvas.getContext('2d')!;

    this.resizeObserver = new ResizeObserver(() => {
      if (this.visible) this.draw();
    });
    this.resizeObserver.observe(this.container.parentElement!);
  }

  show(): void {
    this.visible = true;
    this.container.style.display = 'block';
    this.draw();
  }

  hide(): void {
    this.visible = false;
    this.container.style.display = 'none';
  }

  toggle(): boolean {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
    return this.visible;
  }

  isVisible(): boolean {
    return this.visible;
  }

  /**
   * 更新图片信息
   */
  setImageSize(width: number, height: number): void {
    this.imageWidth = width;
    this.imageHeight = height;
    if (this.visible) this.draw();
  }

  /**
   * 更新变换状态
   */
  private ticking = false;

  updateTransform(scale: number, offsetX: number, offsetY: number): void {
    this.scale = scale;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    
    if (!this.ticking) {
      window.requestAnimationFrame(() => {
        if (this.visible) this.draw();
        this.ticking = false;
      });
      this.ticking = true;
    }
  }

  private draw(): void {
    this.drawHorizontal();
    this.drawVertical();
  }

  private drawHorizontal(): void {
    const rect = this.hCanvas.parentElement!.getBoundingClientRect();
    const rulerSize = 24;
    const width = rect.width - rulerSize;
    const dpr = window.devicePixelRatio || 1;

    this.hCanvas.width = width * dpr;
    this.hCanvas.height = rulerSize * dpr;
    this.hCanvas.style.width = `${width}px`;
    this.hCanvas.style.height = `${rulerSize}px`;

    const ctx = this.hCtx;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, rulerSize);

    // 背景
    ctx.fillStyle = '#16162a';
    ctx.fillRect(0, 0, width, rulerSize);

    // 计算刻度
    const step = this.getStep(this.scale);
    const viewCenter = width / 2;
    const imgCenter = this.imageWidth / 2;

    ctx.fillStyle = '#7878a0';
    ctx.strokeStyle = '#3a3a5a';
    ctx.font = '9px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 0.5;

    // 从 0 向两侧绘制刻度
    const startPx = -(imgCenter * this.scale) + viewCenter + this.offsetX;

    // 绘制范围
    const firstTick = Math.floor(-startPx / (step * this.scale)) * step;
    const lastTick = Math.ceil((width - startPx) / (step * this.scale)) * step;

    for (let px = firstTick; px <= lastTick; px += step) {
      const x = startPx + px * this.scale;
      if (x < 0 || x > width) continue;

      const isMajor = px % (step * 5) === 0;
      const tickHeight = isMajor ? 12 : 6;

      ctx.beginPath();
      ctx.moveTo(x, rulerSize);
      ctx.lineTo(x, rulerSize - tickHeight);
      ctx.stroke();

      if (isMajor) {
        ctx.fillText(String(px), x, 10);
      }
    }

    // 底边线
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, rulerSize - 0.5);
    ctx.lineTo(width, rulerSize - 0.5);
    ctx.stroke();
  }

  private drawVertical(): void {
    const rect = this.vCanvas.parentElement!.getBoundingClientRect();
    const rulerSize = 24;
    const height = rect.height - rulerSize;
    const dpr = window.devicePixelRatio || 1;

    this.vCanvas.width = rulerSize * dpr;
    this.vCanvas.height = height * dpr;
    this.vCanvas.style.width = `${rulerSize}px`;
    this.vCanvas.style.height = `${height}px`;

    const ctx = this.vCtx;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rulerSize, height);

    // 背景
    ctx.fillStyle = '#16162a';
    ctx.fillRect(0, 0, rulerSize, height);

    const step = this.getStep(this.scale);
    const viewCenter = height / 2;
    const imgCenter = this.imageHeight / 2;

    ctx.fillStyle = '#7878a0';
    ctx.strokeStyle = '#3a3a5a';
    ctx.font = '9px Inter, system-ui, sans-serif';
    ctx.lineWidth = 0.5;

    const startPy = -(imgCenter * this.scale) + viewCenter + this.offsetY;
    const firstTick = Math.floor(-startPy / (step * this.scale)) * step;
    const lastTick = Math.ceil((height - startPy) / (step * this.scale)) * step;

    for (let py = firstTick; py <= lastTick; py += step) {
      const y = startPy + py * this.scale;
      if (y < 0 || y > height) continue;

      const isMajor = py % (step * 5) === 0;
      const tickWidth = isMajor ? 12 : 6;

      ctx.beginPath();
      ctx.moveTo(rulerSize, y);
      ctx.lineTo(rulerSize - tickWidth, y);
      ctx.stroke();

      if (isMajor) {
        ctx.save();
        ctx.translate(10, y);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText(String(py), 0, 0);
        ctx.restore();
      }
    }

    // 右边线
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rulerSize - 0.5, 0);
    ctx.lineTo(rulerSize - 0.5, height);
    ctx.stroke();
  }

  /**
   * 根据缩放比例计算合适的刻度步长
   */
  private getStep(scale: number): number {
    const pixelStep = 50 / scale; // 目标约 50px 间距
    const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
    for (const s of steps) {
      if (s >= pixelStep) return s;
    }
    return 1000;
  }

  destroy(): void {
    this.resizeObserver.disconnect();
  }
}
