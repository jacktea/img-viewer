/**
 * 放大镜组件 - 跟随鼠标的圆形放大区域
 */

export class Magnifier {
  private container: HTMLElement;
  private lens: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private image: HTMLImageElement | null = null;
  private zoom: number;
  private radius: number;
  private enabled: boolean = false;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseLeave: () => void;

  constructor(
    container: HTMLElement,
    options: { zoom?: number; radius?: number; enabled?: boolean } = {}
  ) {
    console.log('[Magnifier] Constructor called, options:', options);
    this.container = container;
    this.zoom = options.zoom || 2;
    this.radius = options.radius || 80;

    // 创建放大镜元素
    this.lens = document.createElement('div');
    this.lens.className = 'iv-magnifier';
    this.lens.style.width = `${this.radius * 2}px`;
    this.lens.style.height = `${this.radius * 2}px`;
    this.lens.style.display = 'none';

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.radius * 2;
    this.canvas.height = this.radius * 2;
    this.ctx = this.canvas.getContext('2d')!;

    this.lens.appendChild(this.canvas);
    container.appendChild(this.lens);

    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseLeave = this.onMouseLeave.bind(this);

    if (options.enabled) {
      console.log('[Magnifier] Auto-enabling in constructor');
      this.enable();
    }
  }

  setImage(image: HTMLImageElement): void {
    console.log('[Magnifier] setImage called', image);
    this.image = image;
  }

  enable(): void {
    console.log('[Magnifier] enable() called');
    this.enabled = true;
    this.container.addEventListener('mousemove', this.boundMouseMove);
    this.container.addEventListener('mouseleave', this.boundMouseLeave);
    this.container.style.cursor = 'crosshair';
  }

  disable(): void {
    console.log('[Magnifier] disable() called');
    this.enabled = false;
    this.lens.style.display = 'none';
    this.container.removeEventListener('mousemove', this.boundMouseMove);
    this.container.removeEventListener('mouseleave', this.boundMouseLeave);
    this.container.style.cursor = '';
  }

  // ... (toggle, setZoom, setRadius unchanged)

  toggle(): void {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
  }

  setZoom(zoom: number): void {
    this.zoom = zoom;
  }

  setRadius(radius: number): void {
    this.radius = radius;
    this.lens.style.width = `${radius * 2}px`;
    this.lens.style.height = `${radius * 2}px`;
    this.canvas.width = radius * 2;
    this.canvas.height = radius * 2;
  }

  private onMouseMove(e: MouseEvent): void {
    // console.log('[Magnifier] onMouseMove', { enabled: this.enabled, hasImage: !!this.image });
    if (!this.enabled || !this.image) return;

    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 定位镜片
    this.lens.style.display = 'block';
    this.lens.style.left = `${x - this.radius}px`;
    this.lens.style.top = `${y - this.radius}px`;

    // 计算图片中对应的位置
    const imgRect = this.image.getBoundingClientRect();
    const imgX = e.clientX - imgRect.left;
    const imgY = e.clientY - imgRect.top;

    // 计算图片的原始坐标
    const scaleX = this.image.naturalWidth / imgRect.width;
    const scaleY = this.image.naturalHeight / imgRect.height;
    const sourceX = imgX * scaleX;
    const sourceY = imgY * scaleY;

    // 绘制放大区域
    this.drawMagnified(sourceX, sourceY);
  }

  private onMouseLeave(): void {
    this.lens.style.display = 'none';
  }

  private drawMagnified(centerX: number, centerY: number): void {
    if (!this.image) return;

    const diameter = this.radius * 2;
    const sourceSize = diameter / this.zoom;

    // 清空
    this.ctx.clearRect(0, 0, diameter, diameter);

    // 圆形裁剪
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(this.radius, this.radius, this.radius, 0, Math.PI * 2);
    this.ctx.clip();

    // 绘制放大的图片区域
    this.ctx.drawImage(
      this.image,
      centerX - sourceSize / 2,
      centerY - sourceSize / 2,
      sourceSize,
      sourceSize,
      0,
      0,
      diameter,
      diameter
    );

    // 添加十字准线
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(this.radius, 0);
    this.ctx.lineTo(this.radius, diameter);
    this.ctx.moveTo(0, this.radius);
    this.ctx.lineTo(diameter, this.radius);
    this.ctx.stroke();

    this.ctx.restore();
  }

  destroy(): void {
    this.disable();
    this.lens.remove();
  }
}
