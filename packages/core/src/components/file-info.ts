/**
 * 文件信息面板 - 显示图片基础信息和 EXIF 元数据
 */

import { LoadedImage } from '../types';
import { I18nMessages } from '../i18n';

/** EXIF 数据 */
export interface ExifData {
  cameraMake?: string;
  cameraModel?: string;
  dateTime?: string;
  exposureTime?: string;
  fNumber?: string;
  iso?: string;
  focalLength?: string;
  gps?: string;
}

export class FileInfoPanel {
  private container: HTMLElement;
  private overlay: HTMLElement | null = null;
  private messages: I18nMessages;

  constructor(container: HTMLElement, messages: I18nMessages) {
    this.container = container;
    this.messages = messages;
  }

  updateMessages(messages: I18nMessages): void {
    this.messages = messages;
  }

  async show(image: LoadedImage): Promise<void> {
    this.hide();

    const m = this.messages;

    // 提取 EXIF
    let exif: ExifData | null = null;
    try {
      const response = await fetch(image.blobUrl);
      const buffer = await response.arrayBuffer();
      exif = extractExifData(new Uint8Array(buffer));
    } catch {
      // 忽略 EXIF 提取错误
    }

    this.overlay = document.createElement('div');
    this.overlay.className = 'iv-file-info-overlay';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });

    const panel = document.createElement('div');
    panel.className = 'iv-file-info-panel';

    // 标题栏
    const header = document.createElement('div');
    header.className = 'iv-file-info-header';
    header.innerHTML = `
      <span class="iv-file-info-title">${m.fileInfo}</span>
      <button class="iv-file-info-close" title="${m.close}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    header.querySelector('.iv-file-info-close')!.addEventListener('click', () => this.hide());
    panel.appendChild(header);

    // 信息内容
    const body = document.createElement('div');
    body.className = 'iv-file-info-body';

    // 基础信息
    const rows: [string, string][] = [
      [m.fileName, image.name],
      [m.imageDimensions, `${image.width} × ${image.height}`],
      [m.fileSize, formatFileSize(image.size)],
      [m.mimeType, image.source.mimeType || guessType(image.name)],
    ];

    rows.forEach(([label, value]) => {
      body.appendChild(this.createRow(label, value));
    });

    // EXIF 元数据
    if (exif && Object.keys(exif).length > 0) {
      const divider = document.createElement('div');
      divider.className = 'iv-file-info-divider';
      body.appendChild(divider);

      const metaTitle = document.createElement('div');
      metaTitle.className = 'iv-file-info-section-title';
      metaTitle.textContent = m.metadata;
      body.appendChild(metaTitle);

      const exifMap: [keyof ExifData, string][] = [
        ['cameraMake', m.cameraMake],
        ['cameraModel', m.cameraModel],
        ['dateTime', m.dateTime],
        ['exposureTime', m.exposureTime],
        ['fNumber', m.fNumber],
        ['iso', m.iso],
        ['focalLength', m.focalLength],
        ['gps', m.gps],
      ];

      exifMap.forEach(([key, label]) => {
        if (exif![key]) {
          body.appendChild(this.createRow(label, exif![key]!));
        }
      });
    }

    panel.appendChild(body);
    this.overlay.appendChild(panel);
    this.container.appendChild(this.overlay);

    // 入场动画
    requestAnimationFrame(() => {
      this.overlay?.classList.add('iv-file-info-visible');
    });
  }

  hide(): void {
    if (this.overlay) {
      this.overlay.classList.remove('iv-file-info-visible');
      // 动画完成后移除
      setTimeout(() => {
        this.overlay?.remove();
        this.overlay = null;
      }, 200);
    }
  }

  private createRow(label: string, value: string): HTMLElement {
    const row = document.createElement('div');
    row.className = 'iv-file-info-row';
    row.innerHTML = `
      <span class="iv-file-info-label">${label}</span>
      <span class="iv-file-info-value">${value}</span>
    `;
    return row;
  }

  destroy(): void {
    this.hide();
  }
}

/** 格式化文件大小 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

/** 猜测 MIME 类型 */
function guessType(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    bmp: 'image/bmp', avif: 'image/avif', ico: 'image/x-icon',
  };
  return map[ext] || 'image/*';
}

/**
 * 从 JPEG 数据中提取 EXIF 信息
 * 极简实现，仅解析主要 IFD0 和 EXIF IFD 标签
 */
function extractExifData(data: Uint8Array): ExifData | null {
  // 检查 JPEG SOI 标记
  if (data[0] !== 0xFF || data[1] !== 0xD8) return null;

  // 查找 APP1 (EXIF) 标记
  let offset = 2;
  while (offset < data.length - 1) {
    if (data[offset] !== 0xFF) return null;
    const marker = data[offset + 1];

    if (marker === 0xE1) {
      // APP1 found
      const length = (data[offset + 2] << 8) | data[offset + 3];
      return parseExifApp1(data, offset + 4, length - 2);
    }

    // 跳过其他标记
    if (marker === 0xD8 || marker === 0xD9) {
      offset += 2;
    } else {
      const len = (data[offset + 2] << 8) | data[offset + 3];
      offset += 2 + len;
    }
  }

  return null;
}

function parseExifApp1(data: Uint8Array, start: number, _length: number): ExifData | null {
  // 检查 "Exif\0\0"
  if (String.fromCharCode(...data.slice(start, start + 4)) !== 'Exif') return null;

  const tiffStart = start + 6;
  const byteOrder = (data[tiffStart] << 8) | data[tiffStart + 1];
  const isLittleEndian = byteOrder === 0x4949;

  const read16 = (off: number) => isLittleEndian
    ? data[tiffStart + off] | (data[tiffStart + off + 1] << 8)
    : (data[tiffStart + off] << 8) | data[tiffStart + off + 1];

  const read32 = (off: number) => isLittleEndian
    ? data[tiffStart + off] | (data[tiffStart + off + 1] << 8) |
      (data[tiffStart + off + 2] << 16) | (data[tiffStart + off + 3] << 24)
    : (data[tiffStart + off] << 24) | (data[tiffStart + off + 1] << 16) |
      (data[tiffStart + off + 2] << 8) | data[tiffStart + off + 3];

  const readString = (off: number, len: number) => {
    let s = '';
    for (let i = 0; i < len; i++) {
      const c = data[tiffStart + off + i];
      if (c === 0) break;
      s += String.fromCharCode(c);
    }
    return s.trim();
  };

  const readRational = (off: number) => {
    const num = read32(off);
    const den = read32(off + 4);
    return den ? num / den : 0;
  };

  const result: ExifData = {};

  // 解析 IFD0 找 EXIF SubIFD 和 GPS IFD 偏移
  const ifd0Offset = read32(4);
  let exifIFDOffset = 0;
  let gpsIFDOffset = 0;

  const parseIFD = (ifdOffset: number, handler: (tag: number, type: number, count: number, valueOffset: number) => void) => {
    const entryCount = read16(ifdOffset);
    for (let i = 0; i < entryCount; i++) {
      const entryStart = ifdOffset + 2 + i * 12;
      const tag = read16(entryStart);
      const type = read16(entryStart + 2);
      const count = read32(entryStart + 4);
      const valueOffset = entryStart + 8;
      handler(tag, type, count, valueOffset);
    }
  };

  // IFD0
  try {
    parseIFD(ifd0Offset, (tag, type, count, valueOffset) => {
      switch (tag) {
        case 0x010F: // Make
          result.cameraMake = readString(count > 4 ? read32(valueOffset) : valueOffset, count);
          break;
        case 0x0110: // Model
          result.cameraModel = readString(count > 4 ? read32(valueOffset) : valueOffset, count);
          break;
        case 0x8769: // ExifIFDPointer
          exifIFDOffset = read32(valueOffset);
          break;
        case 0x8825: // GPSInfoIFDPointer
          gpsIFDOffset = read32(valueOffset);
          break;
      }
    });

    // EXIF SubIFD
    if (exifIFDOffset) {
      parseIFD(exifIFDOffset, (tag, _type, count, valueOffset) => {
        switch (tag) {
          case 0x9003: // DateTimeOriginal
            result.dateTime = readString(count > 4 ? read32(valueOffset) : valueOffset, count);
            break;
          case 0x829A: { // ExposureTime
            const off = read32(valueOffset);
            const num = read32(off);
            const den = read32(off + 4);
            result.exposureTime = den ? (num >= den ? `${num / den}s` : `1/${Math.round(den / num)}s`) : '';
            break;
          }
          case 0x829D: { // FNumber
            const off = read32(valueOffset);
            result.fNumber = `f/${readRational(off).toFixed(1)}`;
            break;
          }
          case 0x8827: // ISOSpeedRatings
            result.iso = String(read16(valueOffset));
            break;
          case 0x920A: { // FocalLength
            const off = read32(valueOffset);
            result.focalLength = `${readRational(off).toFixed(1)}mm`;
            break;
          }
        }
      });
    }

    // GPS IFD
    if (gpsIFDOffset) {
      let lat = 0, lon = 0, latRef = '', lonRef = '';
      parseIFD(gpsIFDOffset, (tag, _type, count, valueOffset) => {
        switch (tag) {
          case 0x0001: // GPSLatitudeRef
            latRef = readString(valueOffset, count);
            break;
          case 0x0002: { // GPSLatitude
            const off = read32(valueOffset);
            lat = readRational(off) + readRational(off + 8) / 60 + readRational(off + 16) / 3600;
            break;
          }
          case 0x0003: // GPSLongitudeRef
            lonRef = readString(valueOffset, count);
            break;
          case 0x0004: { // GPSLongitude
            const off = read32(valueOffset);
            lon = readRational(off) + readRational(off + 8) / 60 + readRational(off + 16) / 3600;
            break;
          }
        }
      });
      if (lat && lon) {
        const latSign = latRef === 'S' ? -1 : 1;
        const lonSign = lonRef === 'W' ? -1 : 1;
        result.gps = `${(lat * latSign).toFixed(6)}, ${(lon * lonSign).toFixed(6)}`;
      }
    }
  } catch {
    // EXIF 解析错误时返回已提取的部分
  }

  return Object.keys(result).length > 0 ? result : null;
}
