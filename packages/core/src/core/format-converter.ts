/**
 * 格式转换器 - 按需转换不支持的图片格式（native wasm only）
 * HEIF/TIFF/RAW: 自编译 wasm
 */
import {
  decodeWithNativeWasm,
  getNativeWasmOptions,
  type NativeDecodeMode,
  type NativeWasmCodec,
} from './native-wasm-codecs';

const HEIF_MIME_TYPES = new Set([
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
]);

const TIFF_MIME_TYPES = new Set([
  'image/tiff',
  'image/x-tiff',
]);

const RAW_MIME_TYPES = new Set([
  'image/x-raw',
  'image/raw',
  'image/x-canon-cr2',
  'image/x-nikon-nef',
  'image/x-olympus-orf',
  'image/x-sony-sr2',
  'image/x-adobe-dng',
  'image/x-sony-arw',
  'image/x-fuji-raf',
  'image/x-panasonic-rw2',
  'image/x-pentax-pef',
  'image/x-sigma-x3f',
]);

export interface ConverterDecodeConfig {
  mode: NativeDecodeMode;
  fallbackToRgba8: boolean;
}

const DEFAULT_DECODE_CONFIG: ConverterDecodeConfig = {
  mode: 'auto',
  fallbackToRgba8: true,
};

export class FormatConverter {
  private decodeConfig: ConverterDecodeConfig;

  constructor(config: Partial<ConverterDecodeConfig> = {}) {
    this.decodeConfig = {
      ...DEFAULT_DECODE_CONFIG,
      ...config,
    };
  }

  setDecodeConfig(config: Partial<ConverterDecodeConfig>): void {
    this.decodeConfig = {
      ...this.decodeConfig,
      ...config,
    };
  }

  getDecodeConfig(): ConverterDecodeConfig {
    return { ...this.decodeConfig };
  }

  /**
   * 将不支持的格式转为可显示的 WebP
   */
  async convertToDisplayable(blob: Blob, mimeType: string): Promise<Blob> {
    if (this.isPsdMime(mimeType)) {
      return this.convertPsdToBlob(blob);
    }

    if (this.isHeifMime(mimeType)) {
      return this.convertNativeToBlob(blob, 'heif', 'HEIF');
    }

    if (this.isRawMime(mimeType)) {
      return this.convertNativeToBlob(blob, 'raw', 'RAW');
    }

    if (this.isTiffMime(mimeType)) {
      return this.convertNativeToBlob(blob, 'tiff', 'TIFF');
    }

    throw new Error(`Format ${mimeType || 'unknown'} is not supported for conversion.`);
  }

  private isHeifMime(mimeType: string): boolean {
    return HEIF_MIME_TYPES.has(mimeType.toLowerCase());
  }

  private isRawMime(mimeType: string): boolean {
    return RAW_MIME_TYPES.has(mimeType.toLowerCase());
  }

  private isTiffMime(mimeType: string): boolean {
    return TIFF_MIME_TYPES.has(mimeType.toLowerCase());
  }

  private isPsdMime(mimeType: string): boolean {
    const normalized = mimeType.toLowerCase();
    return normalized === 'image/vnd.adobe.photoshop' ||
      normalized === 'application/x-photoshop' ||
      normalized === 'image/psd' ||
      normalized === 'application/psd';
  }

  private async convertNativeToBlob(
    blob: Blob,
    codec: NativeWasmCodec,
    label: 'HEIF' | 'TIFF' | 'RAW'
  ): Promise<Blob> {
    const decoded = await decodeWithNativeWasm(codec, blob, {
      mode: this.decodeConfig.mode,
      fallbackToRgba8: this.decodeConfig.fallbackToRgba8,
    });
    if (!decoded) {
      const opts = getNativeWasmOptions();
      throw new Error(
        `${label} native wasm is not active for codec='${codec}'. ` +
        `Current options: enabled=${opts.enabled}, preferNative=${opts.preferNative}, codecs=${opts.codecs.join(',')}, baseUrl=${opts.baseUrl}, decodeMode=${this.decodeConfig.mode}, fallbackToRgba8=${this.decodeConfig.fallbackToRgba8}`
      );
    }

    return this.rgbaToWebpBlob(decoded.rgba, decoded.width, decoded.height);
  }

  private async rgbaToWebpBlob(
    rgba: Uint8ClampedArray,
    width: number,
    height: number
  ): Promise<Blob> {
    const imageData = new ImageData(width, height);
    imageData.data.set(rgba);
    return this.imageDataToWebpBlob(imageData);
  }

  private imageDataToWebpBlob(imageData: ImageData): Promise<Blob> {
    const canvasElement = document.createElement('canvas');
    const context = canvasElement.getContext('2d');
    if (!context) {
      throw new Error('Could not create canvas context');
    }

    canvasElement.width = imageData.width;
    canvasElement.height = imageData.height;
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
  }

  private async convertPsdToBlob(blob: Blob): Promise<Blob> {
    try {
      const { default: Psd } = await import('@webtoon/psd');
      const buffer = await blob.arrayBuffer();
      const psdFile = Psd.parse(buffer);

      const compositeBuffer = await psdFile.composite();
      const imageData = new ImageData(
        new Uint8ClampedArray(compositeBuffer),
        psdFile.width,
        psdFile.height
      );

      return this.imageDataToWebpBlob(imageData);
    } catch (error) {
      throw new Error(`PSD conversion failed: ${error}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    return typeof document !== 'undefined';
  }
}
