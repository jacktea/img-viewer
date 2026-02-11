/**
 * 国际化支持
 */

/** 翻译消息接口 */
export interface I18nMessages {
  // 工具栏按钮
  rotateLeft: string;
  rotateRight: string;
  flipX: string;
  flipY: string;
  zoomIn: string;
  zoomOut: string;
  reset: string;
  prev: string;
  next: string;
  fullscreen: string;
  download: string;
  magnifier: string;
  info: string;

  // 模式
  modeSingle: string;
  modeCarousel: string;
  modeSlideshow: string;
  modeGallery: string;

  // 加载状态
  loading: string;
  loadingProgress: string; // "{loaded}/{total}"
  loadError: string;

  // 文件信息
  fileInfo: string;
  fileName: string;
  fileSize: string;
  imageDimensions: string;
  mimeType: string;
  metadata: string;
  cameraMake: string;
  cameraModel: string;
  dateTime: string;
  exposureTime: string;
  fNumber: string;
  iso: string;
  focalLength: string;
  gps: string;
  close: string;

  // 拖拽
  dropHint: string;
}

/** 中文语言包 */
const zhCN: I18nMessages = {
  rotateLeft: '逆时针旋转',
  rotateRight: '顺时针旋转',
  flipX: '水平翻转',
  flipY: '垂直翻转',
  zoomIn: '放大',
  zoomOut: '缩小',
  reset: '重置',
  prev: '上一张',
  next: '下一张',
  fullscreen: '全屏',
  download: '下载',
  magnifier: '放大镜',
  info: '文件信息',

  modeSingle: '单图',
  modeCarousel: '轮播',
  modeSlideshow: '幻灯片',
  modeGallery: '相册',

  loading: '加载中...',
  loadingProgress: '加载中... ({loaded}/{total})',
  loadError: '加载失败',

  fileInfo: '文件信息',
  fileName: '文件名',
  fileSize: '文件大小',
  imageDimensions: '图片尺寸',
  mimeType: '类型',
  metadata: '元数据 (EXIF)',
  cameraMake: '相机厂商',
  cameraModel: '相机型号',
  dateTime: '拍摄时间',
  exposureTime: '曝光时间',
  fNumber: '光圈',
  iso: 'ISO',
  focalLength: '焦距',
  gps: 'GPS 坐标',
  close: '关闭',

  dropHint: '拖放图片到此处',
};

/** 英文语言包 */
const en: I18nMessages = {
  rotateLeft: 'Rotate Left',
  rotateRight: 'Rotate Right',
  flipX: 'Flip Horizontal',
  flipY: 'Flip Vertical',
  zoomIn: 'Zoom In',
  zoomOut: 'Zoom Out',
  reset: 'Reset',
  prev: 'Previous',
  next: 'Next',
  fullscreen: 'Fullscreen',
  download: 'Download',
  magnifier: 'Magnifier',
  info: 'File Info',

  modeSingle: 'Single',
  modeCarousel: 'Carousel',
  modeSlideshow: 'Slideshow',
  modeGallery: 'Gallery',

  loading: 'Loading...',
  loadingProgress: 'Loading... ({loaded}/{total})',
  loadError: 'Failed to load',

  fileInfo: 'File Info',
  fileName: 'File Name',
  fileSize: 'File Size',
  imageDimensions: 'Dimensions',
  mimeType: 'Type',
  metadata: 'Metadata (EXIF)',
  cameraMake: 'Camera Make',
  cameraModel: 'Camera Model',
  dateTime: 'Date Taken',
  exposureTime: 'Exposure Time',
  fNumber: 'F-Number',
  iso: 'ISO',
  focalLength: 'Focal Length',
  gps: 'GPS',
  close: 'Close',

  dropHint: 'Drop images here',
};

/** 内置语言包 */
const LOCALES: Record<string, I18nMessages> = {
  'zh-CN': zhCN,
  'en': en,
};

/** 获取指定 locale 的消息，不存在则回退到 zh-CN */
export function getMessages(locale: string): I18nMessages {
  return LOCALES[locale] || LOCALES['zh-CN'];
}

/** 支持的语言列表 */
export type LocaleName = 'zh-CN' | 'en';

/** 注册自定义语言包 */
export function registerLocale(name: string, messages: I18nMessages): void {
  LOCALES[name] = messages;
}
