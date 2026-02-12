/**
 * 格式转换器 - 使用 magickwand.js 按需转换不支持的图片格式
 * 仅使用本地打包的 WASM 资源，不从公网加载文件
 */

type MagickWandModule = typeof import('magickwand.js');
type MagickWandBindings = Awaited<MagickWandModule['default']>;

export class FormatConverter {
  private magickBindings: MagickWandBindings | null = null;

  private async loadMagickWandModule(): Promise<MagickWandModule> {
    // 直接使用字面量动态导入，让宿主打包器可追踪并产出 wasm 资源
    return import('magickwand.js') as Promise<MagickWandModule>;
  }

  /**
   * 动态加载 magickwand.js（按需）
   */
  private async ensureInitialized(): Promise<MagickWandBindings> {
    if (this.magickBindings) {
      return this.magickBindings;
    }

    if (typeof window !== 'undefined' && !window.crossOriginIsolated) {
      throw new Error(
        'Image conversion requires a cross-origin isolated context. ' +
        'Please serve with COOP/COEP headers: ' +
        'Cross-Origin-Opener-Policy=same-origin and Cross-Origin-Embedder-Policy=credentialless.'
      );
    }

    try {
      const magickwand = await this.loadMagickWandModule();
      const bindings = await magickwand.default;
      this.magickBindings = bindings;
      return bindings;
    } catch (error) {
      throw new Error(
        `Failed to initialize magickwand.js. ` +
        `Ensure the host app installs magickwand.js and serves its WASM assets locally without SPA rewrite.\n` +
        `Original error: ${error}`
      );
    }
  }

  /**
   * 将不支持的格式转为可显示的 WebP
   */
  async convertToDisplayable(blob: Blob, mimeType: string): Promise<Blob> {
    // 优先处理 PSD，不需要加载 MagickWand WASM
    if (this.isPsdMime(mimeType)) {
      return this.convertPsdToBlob(blob);
    }

    const { Magick } = await this.ensureInitialized();
    const inputBuffer = await blob.arrayBuffer();

    try {
      const inputMagickBlob = new Magick.Blob(inputBuffer);
      const image = new Magick.Image();
      await image.readAsync(inputMagickBlob);
      await image.magickAsync('WEBP');

      const outputMagickBlob = new Magick.Blob();
      await image.writeAsync(outputMagickBlob);

      const outputBuffer = outputMagickBlob.data().slice(0);
      return new Blob([outputBuffer], { type: 'image/webp' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes('no decode delegate for this image format')) {
        if (this.isHeicLikeMime(mimeType)) {
          throw new Error(
            'HEIC/HEIF conversion is not available in the current magickwand.js WASM build ' +
            '(missing HEIF decode delegate). Please convert to JPEG/PNG before preview.'
          );
        }

        throw new Error(
          `Format ${mimeType || 'unknown'} is not supported by the current magickwand.js WASM build ` +
          '(missing decode delegate).'
        );
      }

      throw new Error(`Format conversion failed: ${message}`);
    }
  }

  private isHeicLikeMime(mimeType: string): boolean {
    const normalized = mimeType.toLowerCase();
    return normalized === 'image/heic' ||
      normalized === 'image/heif' ||
      normalized === 'image/heic-sequence' ||
      normalized === 'image/heif-sequence';
  }

  private isPsdMime(mimeType: string): boolean {
    const normalized = mimeType.toLowerCase();
    return normalized === 'image/vnd.adobe.photoshop' ||
      normalized === 'application/x-photoshop' || 
      normalized === 'image/psd' ||
      normalized === 'application/psd';
  }

  private async convertPsdToBlob(blob: Blob): Promise<Blob> {
    try {
      // 动态导入以避免非 PSD 场景下的加载开销
      // @webtoon/psd uses default export
      const { default: Psd } = await import('@webtoon/psd');
      
      const buffer = await blob.arrayBuffer();
      const psdFile = Psd.parse(buffer);
      
      // 合成图像数据
      const canvasElement = document.createElement('canvas');
      const context = canvasElement.getContext('2d');
      
      if (!context) {
        throw new Error('Could not create canvas context');
      }

      canvasElement.width = psdFile.width;
      canvasElement.height = psdFile.height;

      const compositeBuffer = await psdFile.composite();
      const imageData = new ImageData(
        new Uint8ClampedArray(compositeBuffer),
        psdFile.width,
        psdFile.height
      );

      context.putImageData(imageData, 0, 0);

      return new Promise((resolve, reject) => {
        canvasElement.toBlob((resultBlob) => {
          if (resultBlob) {
            resolve(resultBlob);
          } else {
            reject(new Error('Canvas to Blob conversion failed'));
          }
        }, 'image/webp');
      });
    } catch (error) {
      throw new Error(`PSD conversion failed: ${error}`);
    }
  }

  /**
   * 检查是否可用（MagickWand 或 PSD 均视为可用）
   */
  async isAvailable(): Promise<boolean> {
    // 既然支持 PSD 了，转换器本身总是部分可用的（只要能加载 JS）
    // 但这个方法主要还是检查 MagickWand 的可用性，保持兼容
    try {
      const magickwand = await this.loadMagickWandModule();
      await magickwand.default;
      return true;
    } catch {
      // 即使 MagickWand 失败，如果我们只是转换 PSD，其实也没问题
      // 但这里保持原意，返回 MagickWand 的状态
      return false;
    }
  }
}
