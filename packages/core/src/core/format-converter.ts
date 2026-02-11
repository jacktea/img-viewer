/**
 * 格式转换器 - 使用 @imagemagick/magick-wasm 按需转换不支持的图片格式
 */

// magick-wasm 类型
type MagickModule = typeof import('@imagemagick/magick-wasm');

export class FormatConverter {
  private initialized = false;
  private magickModule: MagickModule | null = null;

  /**
   * 动态加载 magick-wasm（按需）
   */
  private async ensureInitialized(): Promise<MagickModule> {
    if (this.magickModule && this.initialized) {
      return this.magickModule;
    }

    try {
      const magick: MagickModule = await import('@imagemagick/magick-wasm');

      if (!this.initialized) {
        // 让 magick-wasm 自行定位 WASM 文件
        // 外部使用者需要确保 magick.wasm 可在运行时被访问到
        // 方法1: 通过 CDN 获取 WASM
        // 方法2: 将 magick.wasm 复制到 public 目录
        const pkgName = '@imagemagick/magick-wasm';
        const wasmPath = `https://cdn.jsdelivr.net/npm/${pkgName}/dist/magick.wasm`;

        const response = await fetch(wasmPath);
        const wasmBytes = new Uint8Array(await response.arrayBuffer());
        await magick.initializeImageMagick(wasmBytes);
        this.initialized = true;
      }

      this.magickModule = magick;
      return magick;
    } catch (error) {
      throw new Error(
        `@imagemagick/magick-wasm is required to view this image format. ` +
        `Please install it: pnpm add @imagemagick/magick-wasm\n` +
        `Original error: ${error}`
      );
    }
  }

  /**
   * 将不支持的格式转为可显示的 PNG
   */
  async convertToDisplayable(blob: Blob, _mimeType: string): Promise<Blob> {
    const magick = await this.ensureInitialized();
    const { ImageMagick, MagickFormat } = magick;

    const arrayBuffer = await blob.arrayBuffer();
    const inputData = new Uint8Array(arrayBuffer);

    return new Promise<Blob>((resolve, reject) => {
      try {
        ImageMagick.read(inputData, (image) => {
          image.write(MagickFormat.Png, (outputData: Uint8Array) => {
            // .slice() 确保获得独立的 ArrayBuffer，避免 SharedArrayBuffer 类型问题
            const data = new Uint8Array(outputData).slice();
            const outputBlob = new Blob([data], { type: 'image/png' });
            resolve(outputBlob);
          });
        });
      } catch (error) {
        reject(new Error(`Format conversion failed: ${error}`));
      }
    });
  }

  /**
   * 检查 magick-wasm 是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      await import('@imagemagick/magick-wasm');
      return true;
    } catch {
      return false;
    }
  }
}
