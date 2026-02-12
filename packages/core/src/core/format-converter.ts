/**
 * 格式转换器 - 按需转换不支持的图片格式
 * HEIF: libheif-js
 * RAW: libraw-wasm
 * TIFF: tiff
 */

type PixelArray = Uint8Array | Uint16Array | Float32Array | Float64Array;

interface PixelSource {
  width: number;
  height: number;
  channels: number;
  data: PixelArray;
}

interface HeifImageLike {
  get_width(): number;
  get_height(): number;
  is_primary?(): boolean;
  display(target: ImageData, callback: (result: ImageData | null) => void): void;
  free?(): void;
}

interface HeifDecoderLike {
  decode(data: Uint8Array): HeifImageLike[];
}

interface HeifModuleLike {
  HeifDecoder: new () => HeifDecoderLike;
}

interface RawDecoderLike {
  worker?: { terminate?: () => void };
  open(buffer: Uint8Array, settings?: Record<string, unknown>): Promise<unknown>;
  metadata(fullOutput?: boolean): Promise<unknown>;
  imageData(): Promise<unknown>;
}

interface TiffPageLike {
  width: number;
  height: number;
  samplesPerPixel?: number;
  data: PixelArray;
  palette?: Array<[number, number, number]>;
}

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

export class FormatConverter {
  private async loadHeifModule(): Promise<HeifModuleLike> {
    const imported = await import('libheif-js/libheif-wasm/libheif-bundle.mjs');
    const candidate = (imported as { default?: unknown }).default ?? imported;

    const moduleLike = typeof candidate === 'function'
      ? await (candidate as () => Promise<unknown> | unknown)()
      : candidate;

    if (!moduleLike || typeof moduleLike !== 'object') {
      throw new Error('Invalid libheif module result');
    }

    const libheif = moduleLike as Partial<HeifModuleLike>;
    if (typeof libheif.HeifDecoder !== 'function') {
      throw new Error('libheif module does not expose HeifDecoder');
    }

    return libheif as HeifModuleLike;
  }

  /**
   * 将不支持的格式转为可显示的 WebP
   */
  async convertToDisplayable(blob: Blob, mimeType: string): Promise<Blob> {
    if (this.isPsdMime(mimeType)) {
      return this.convertPsdToBlob(blob);
    }

    if (this.isHeifMime(mimeType)) {
      return this.convertHeifToBlob(blob);
    }

    if (this.isRawMime(mimeType)) {
      return this.convertRawToBlob(blob);
    }

    if (this.isTiffMime(mimeType)) {
      return this.convertTiffToBlob(blob);
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

  private async convertHeifToBlob(blob: Blob): Promise<Blob> {
    try {
      const libheif = await this.loadHeifModule();
      const decoder = new libheif.HeifDecoder();

      const images = decoder.decode(new Uint8Array(await blob.arrayBuffer()));
      if (!images.length) {
        throw new Error('No image found in HEIF file');
      }

      const image = this.pickHeifImage(images);
      const width = image.get_width();
      const height = image.get_height();
      const imageData = new ImageData(width, height);

      try {
        await new Promise<void>((resolve, reject) => {
          image.display(imageData, (result) => {
            if (!result) {
              reject(new Error('HEIF decoding returned empty output'));
              return;
            }
            resolve();
          });
        });
      } finally {
        image.free?.();
      }

      return this.imageDataToWebpBlob(imageData);
    } catch (error) {
      throw new Error(`HEIF conversion failed: ${error}`);
    }
  }

  private pickHeifImage(images: HeifImageLike[]): HeifImageLike {
    for (const image of images) {
      if (typeof image.is_primary !== 'function') {
        continue;
      }

      try {
        if (image.is_primary()) {
          return image;
        }
      } catch {
        // 某些 libheif-js 构建里 is_primary 内部会引用未绑定符号；忽略并降级
      }
    }

    return images[0];
  }

  private async convertRawToBlob(blob: Blob): Promise<Blob> {
    if (typeof window !== 'undefined' && !window.crossOriginIsolated) {
      throw new Error(
        'RAW conversion requires a cross-origin isolated context. ' +
        'Please serve with COOP/COEP headers: ' +
        'Cross-Origin-Opener-Policy=same-origin and Cross-Origin-Embedder-Policy=credentialless.'
      );
    }

    const { default: LibRaw } = await import('libraw-wasm');
    const decoder = new LibRaw() as unknown as RawDecoderLike;

    try {
      const input = new Uint8Array(await blob.arrayBuffer());
      await decoder.open(input, {
        outputBps: 8,
        outputColor: 1,
      });

      const metadata = await decoder.metadata(true);
      const output = await decoder.imageData();
      const source = this.extractRawPixels(output, metadata);
      const rgba = this.expandToRgba(source.data, source.width, source.height, source.channels);

      return this.rgbaToWebpBlob(rgba, source.width, source.height);
    } catch (error) {
      throw new Error(`RAW conversion failed: ${error}`);
    } finally {
      decoder.worker?.terminate?.();
    }
  }

  private async convertTiffToBlob(blob: Blob): Promise<Blob> {
    try {
      const { decode } = await import('tiff');
      const pages = decode(new Uint8Array(await blob.arrayBuffer())) as unknown as TiffPageLike[];
      if (!pages.length) {
        throw new Error('No page found in TIFF file');
      }

      const page = pages[0];
      const width = page.width;
      const height = page.height;
      if (!width || !height || !page.data) {
        throw new Error('Invalid TIFF page data');
      }

      const channelsFromPage = Number.isFinite(page.samplesPerPixel)
        ? Math.max(1, Number(page.samplesPerPixel))
        : 0;
      const inferredChannels = Math.max(1, Math.round(page.data.length / (width * height)));
      const channels = channelsFromPage || inferredChannels;

      const rgba = new Uint8ClampedArray(width * height * 4);

      for (let i = 0; i < width * height; i++) {
        const outOffset = i * 4;

        if (page.palette && channels === 1) {
          const colorIndex = this.sampleToByte(page.data, i);
          const color = page.palette[colorIndex] ?? [0, 0, 0];
          rgba[outOffset] = this.normalizePaletteValue(color[0]);
          rgba[outOffset + 1] = this.normalizePaletteValue(color[1]);
          rgba[outOffset + 2] = this.normalizePaletteValue(color[2]);
          rgba[outOffset + 3] = 255;
          continue;
        }

        const base = i * channels;
        if (channels === 1) {
          const v = this.sampleToByte(page.data, base);
          rgba[outOffset] = v;
          rgba[outOffset + 1] = v;
          rgba[outOffset + 2] = v;
          rgba[outOffset + 3] = 255;
        } else if (channels === 2) {
          const v = this.sampleToByte(page.data, base);
          rgba[outOffset] = v;
          rgba[outOffset + 1] = v;
          rgba[outOffset + 2] = v;
          rgba[outOffset + 3] = this.sampleToByte(page.data, base + 1);
        } else {
          rgba[outOffset] = this.sampleToByte(page.data, base);
          rgba[outOffset + 1] = this.sampleToByte(page.data, base + 1);
          rgba[outOffset + 2] = this.sampleToByte(page.data, base + 2);
          rgba[outOffset + 3] = channels >= 4 ? this.sampleToByte(page.data, base + 3) : 255;
        }
      }

      return this.rgbaToWebpBlob(rgba, width, height);
    } catch (error) {
      throw new Error(`TIFF conversion failed: ${error}`);
    }
  }

  private extractRawPixels(output: unknown, metadata: unknown): PixelSource {
    const data = this.findPixelArray(output);
    if (!data) {
      throw new Error('Could not locate RAW pixel buffer');
    }

    const dimensions = this.findDimensions(output) ?? this.findDimensions(metadata);
    if (!dimensions) {
      throw new Error('Could not determine RAW image dimensions');
    }

    const { width, height } = dimensions;
    const pixels = width * height;
    if (pixels <= 0) {
      throw new Error('Invalid RAW dimensions');
    }

    const channelsFromOutput = this.findChannelCount(output);
    const channelsFromMetadata = this.findChannelCount(metadata);
    const inferredChannels = Number.isInteger(data.length / pixels)
      ? data.length / pixels
      : NaN;

    let channels = channelsFromOutput || channelsFromMetadata || (Number.isFinite(inferredChannels)
      ? inferredChannels
      : 3);
    if (!Number.isFinite(channels) || channels < 1) {
      channels = 3;
    }
    channels = Math.min(4, Math.max(1, Math.round(channels)));

    return {
      width,
      height,
      channels,
      data,
    };
  }

  private findPixelArray(source: unknown, visited = new Set<unknown>()): PixelArray | null {
    if (!source || visited.has(source)) {
      return null;
    }
    visited.add(source);

    if (source instanceof Uint8Array ||
      source instanceof Uint16Array ||
      source instanceof Float32Array ||
      source instanceof Float64Array) {
      return source;
    }

    if (source instanceof ArrayBuffer) {
      return new Uint8Array(source);
    }

    if (Array.isArray(source)) {
      if (source.length && typeof source[0] === 'number') {
        return Uint8Array.from(source);
      }
      for (const value of source) {
        const nested = this.findPixelArray(value, visited);
        if (nested) return nested;
      }
      return null;
    }

    if (typeof source !== 'object') {
      return null;
    }

    const record = source as Record<string, unknown>;
    const preferredKeys = ['data', 'pixels', 'pixelData', 'imageData', 'rgb', 'buffer'];
    for (const key of preferredKeys) {
      if (!(key in record)) continue;
      const nested = this.findPixelArray(record[key], visited);
      if (nested) return nested;
    }

    for (const value of Object.values(record)) {
      const nested = this.findPixelArray(value, visited);
      if (nested) return nested;
    }
    return null;
  }

  private findDimensions(source: unknown): { width: number; height: number } | null {
    if (!source || typeof source !== 'object') {
      return null;
    }

    const queue: unknown[] = [source];
    const visited = new Set<unknown>();
    const pairs: Array<[string, string]> = [
      ['width', 'height'],
      ['imageWidth', 'imageHeight'],
      ['raw_width', 'raw_height'],
      ['iwidth', 'iheight'],
      ['w', 'h'],
    ];

    while (queue.length) {
      const current = queue.shift();
      if (!current || typeof current !== 'object' || visited.has(current)) {
        continue;
      }
      visited.add(current);

      if (ArrayBuffer.isView(current) || current instanceof ArrayBuffer) {
        continue;
      }

      const record = current as Record<string, unknown>;

      for (const [wKey, hKey] of pairs) {
        const w = this.toPositiveInt(record[wKey]);
        const h = this.toPositiveInt(record[hKey]);
        if (w && h) {
          return { width: w, height: h };
        }
      }

      for (const value of Object.values(record)) {
        if (value && typeof value === 'object') {
          queue.push(value);
        }
      }
    }

    return null;
  }

  private findChannelCount(source: unknown): number | null {
    if (!source || typeof source !== 'object') {
      return null;
    }

    const queue: unknown[] = [source];
    const visited = new Set<unknown>();
    const keys = ['channels', 'components', 'samplesPerPixel', 'cpp', 'colors'];

    while (queue.length) {
      const current = queue.shift();
      if (!current || typeof current !== 'object' || visited.has(current)) {
        continue;
      }
      visited.add(current);

      if (ArrayBuffer.isView(current) || current instanceof ArrayBuffer) {
        continue;
      }

      const record = current as Record<string, unknown>;
      for (const key of keys) {
        const value = this.toPositiveInt(record[key]);
        if (value) {
          return value;
        }
      }

      for (const value of Object.values(record)) {
        if (value && typeof value === 'object') {
          queue.push(value);
        }
      }
    }

    return null;
  }

  private toPositiveInt(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      return null;
    }
    return Math.round(value);
  }

  private expandToRgba(
    data: PixelArray,
    width: number,
    height: number,
    channels: number
  ): Uint8ClampedArray {
    const rgba = new Uint8ClampedArray(width * height * 4);
    const pixelCount = width * height;

    for (let i = 0; i < pixelCount; i++) {
      const outOffset = i * 4;
      const base = i * channels;

      if (channels === 1) {
        const v = this.sampleToByte(data, base);
        rgba[outOffset] = v;
        rgba[outOffset + 1] = v;
        rgba[outOffset + 2] = v;
        rgba[outOffset + 3] = 255;
      } else if (channels === 2) {
        const v = this.sampleToByte(data, base);
        rgba[outOffset] = v;
        rgba[outOffset + 1] = v;
        rgba[outOffset + 2] = v;
        rgba[outOffset + 3] = this.sampleToByte(data, base + 1);
      } else {
        rgba[outOffset] = this.sampleToByte(data, base);
        rgba[outOffset + 1] = this.sampleToByte(data, base + 1);
        rgba[outOffset + 2] = this.sampleToByte(data, base + 2);
        rgba[outOffset + 3] = channels >= 4 ? this.sampleToByte(data, base + 3) : 255;
      }
    }

    return rgba;
  }

  private sampleToByte(data: PixelArray, index: number): number {
    if (index < 0 || index >= data.length) {
      return 0;
    }
    const value = data[index];

    if (data instanceof Uint8Array) {
      return value;
    }

    if (data instanceof Uint16Array) {
      return Math.max(0, Math.min(255, Math.round(value / 257)));
    }

    if (!Number.isFinite(value)) {
      return 0;
    }

    if (value >= 0 && value <= 1) {
      return Math.round(value * 255);
    }

    return Math.max(0, Math.min(255, Math.round(value)));
  }

  private normalizePaletteValue(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    if (value > 255) {
      return Math.max(0, Math.min(255, Math.round(value / 257)));
    }
    return Math.max(0, Math.min(255, Math.round(value)));
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
