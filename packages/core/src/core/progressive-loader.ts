/**
 * 渐进式加载 - 大图先显示模糊缩略图，然后逐步加载清晰版本
 */

export class ProgressiveLoader {
  private threshold: number;

  constructor(threshold: number = 1024 * 1024) {
    this.threshold = threshold;
  }

  /**
   * 判断图片是否需要渐进式加载
   */
  needsProgressiveLoading(size: number): boolean {
    return size > this.threshold;
  }

  /**
   * 创建模糊缩略图
   */
  async createThumbnail(
    blobUrl: string,
    maxSize: number = 64
  ): Promise<string> {
    const img = await this.loadImage(blobUrl);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // 计算缩略图尺寸
    const ratio = Math.min(maxSize / img.naturalWidth, maxSize / img.naturalHeight);
    canvas.width = Math.round(img.naturalWidth * ratio);
    canvas.height = Math.round(img.naturalHeight * ratio);

    // 绘制低分辨率缩略图
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', 0.3);
  }

  /**
   * 渐进式加载 URL 图片
   * 通过 fetch + ReadableStream 实现
   */
  async loadProgressive(
    url: string,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<Blob> {
    const response = await fetch(url);

    if (!response.body) {
      return await response.blob();
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      receivedLength += value.length;
      onProgress?.(receivedLength, contentLength);
    }

    const buffer = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, position);
      position += chunk.length;
    }

    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    return new Blob([buffer], { type: mimeType });
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  }
}
