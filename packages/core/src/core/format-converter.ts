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
        'Cross-Origin-Opener-Policy=same-origin and Cross-Origin-Embedder-Policy=require-corp.'
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

  /**
   * 检查 magickwand.js 是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      const magickwand = await this.loadMagickWandModule();
      await magickwand.default;
      return true;
    } catch {
      return false;
    }
  }
}
