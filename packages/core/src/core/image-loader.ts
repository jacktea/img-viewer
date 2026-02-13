/**
 * 图片加载器 - 支持本地文件和远程 URL
 */
import { ImageSource, LoadedImage, NATIVE_IMAGE_TYPES, type DecoderConfig } from '../types';
import { FormatConverter } from './format-converter';

export class ImageLoader {
  private converter: FormatConverter;

  constructor(decoderConfig?: Partial<DecoderConfig>) {
    this.converter = new FormatConverter({
      mode: decoderConfig?.type,
      fallbackToRgba8: decoderConfig?.fallbackToRgba8,
    });
  }

  setDecoderConfig(config: Partial<DecoderConfig>): void {
    this.converter.setDecodeConfig({
      mode: config.type,
      fallbackToRgba8: config.fallbackToRgba8,
    });
  }

  /**
   * 加载图片
   */
  async load(source: ImageSource): Promise<LoadedImage> {
    let blob: Blob;
    let name: string;

    switch (source.type) {
      case 'file': {
        const file = source.data as File;
        blob = file;
        name = source.name || file.name;
        break;
      }
      case 'url': {
        const url = source.data as string;
        name = source.name || this.getFileNameFromUrl(url);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        blob = await response.blob();
        break;
      }
      case 'base64': {
        const base64 = source.data as string;
        name = source.name || 'image';
        blob = this.base64ToBlob(base64, source.mimeType);
        break;
      }
      default:
        throw new Error(`Unknown source type: ${(source as ImageSource).type}`);
    }

    // 检查是否需要格式转换
    let converted = false;
    let mimeType = source.mimeType || blob.type;

    // 如果 MIME 类型未知或通用，尝试根据文件名推测
    if (!mimeType || mimeType === 'application/octet-stream') {
      mimeType = this.guessMimeType(name);
    }
    
    if (!this.isNativelySupported(mimeType)) {
      blob = await this.converter.convertToDisplayable(blob, mimeType);
      converted = true;
    }

    // 获取图片尺寸
    const blobUrl = URL.createObjectURL(blob);
    const { width, height } = await this.getImageDimensions(blobUrl);

    return {
      source,
      blobUrl,
      width,
      height,
      size: blob.size,
      name,
      converted,
    };
  }

  /**
   * 批量加载图片
   */
  async loadAll(
    sources: ImageSource[],
    onProgress?: (loaded: number, total: number) => void
  ): Promise<LoadedImage[]> {
    const results: LoadedImage[] = [];
    let loaded = 0;

    for (const source of sources) {
      const image = await this.load(source);
      results.push(image);
      loaded++;
      onProgress?.(loaded, sources.length);
    }

    return results;
  }

  /**
   * 释放已加载图片的资源
   */
  release(image: LoadedImage): void {
    if (image.blobUrl) {
      URL.revokeObjectURL(image.blobUrl);
    }
  }

  /**
   * 检查 MIME 类型是否原生支持
   */
  private isNativelySupported(mimeType: string): boolean {
    if (!mimeType || mimeType === 'application/octet-stream') {
      return false;
    }
    return NATIVE_IMAGE_TYPES.has(mimeType);
  }

  /**
   * 从 URL 提取文件名
   */
  private getFileNameFromUrl(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      const segments = pathname.split('/');
      return segments[segments.length - 1] || 'image';
    } catch {
      return 'image';
    }
  }

  /**
   * 根据文件名推测 MIME 类型
   */
  private guessMimeType(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      bmp: 'image/bmp',
      ico: 'image/x-icon',
      avif: 'image/avif',
      tiff: 'image/tiff',
      tif: 'image/tiff',
      psd: 'image/vnd.adobe.photoshop',
      raw: 'image/x-raw',
      cr2: 'image/x-canon-cr2',
      nef: 'image/x-nikon-nef',
      orf: 'image/x-olympus-orf',
      sr2: 'image/x-sony-sr2',
      dng: 'image/x-adobe-dng',
      arw: 'image/x-sony-arw',
      heic: 'image/heic',
      heif: 'image/heif',
      jbig: 'image/jbig',
      jbg: 'image/jbig',
      bie: 'image/jbig',
      jng: 'image/x-jng',
      jp2: 'image/jp2',
      j2k: 'image/jp2',
      jpf: 'image/jp2',
      jpx: 'image/jp2',
      jpm: 'image/jp2',
      mj2: 'image/jp2',
      exr: 'image/x-exr',
    };
    return ext ? mimeMap[ext] || 'application/octet-stream' : 'application/octet-stream';
  }

  /**
   * base64 转 Blob
   */
  private base64ToBlob(base64: string, mimeType?: string): Blob {
    // 处理 data URL 格式
    let data = base64;
    let type = mimeType || 'application/octet-stream';
    
    if (base64.startsWith('data:')) {
      const match = base64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        type = match[1];
        data = match[2];
      }
    }

    const binary = atob(data);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type });
  }

  /**
   * 获取图片尺寸
   */
  private getImageDimensions(url: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('Failed to load image for dimensions'));
      img.src = url;
    });
  }
}
