import bundledHeifJsUrl from '../wasm/libheif/libheif.js?url';
import bundledHeifWasmUrl from '../wasm/libheif/libheif.wasm?url';
import bundledLibrawJsUrl from '../wasm/libraw/libraw.js?url';
import bundledLibrawWasmUrl from '../wasm/libraw/libraw.wasm?url';
import bundledLibtiffJsUrl from '../wasm/libtiff/libtiff.js?url';
import bundledLibtiffWasmUrl from '../wasm/libtiff/libtiff.wasm?url';

export type NativeWasmCodec = 'heif' | 'tiff' | 'raw';
export type NativeDecodeMode = 'auto' | 'rgba8' | 'rgba16';

export interface NativeWasmOptions {
  enabled: boolean;
  preferNative: boolean;
  // Optional external base URL. Empty string means use bundled assets from core.
  baseUrl: string;
  codecs: NativeWasmCodec[];
}

export interface NativeDecodeRequest {
  mode?: NativeDecodeMode;
  // When mode is `rgba16`, fallback to rgba8 decoder if rgba16 is unavailable/failed.
  fallbackToRgba8?: boolean;
}

export interface NativeDecodeResult {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  backend: string;
  decodeMode: Exclude<NativeDecodeMode, 'auto'>;
  bitDepth: number;
}

interface EmscriptenFs {
  writeFile(path: string, data: Uint8Array): void;
  unlink(path: string): void;
}

interface EmscriptenModuleLike {
  FS: EmscriptenFs;
  HEAPU8: Uint8Array;
  HEAPU16: Uint16Array;
  _malloc(size: number): number;
  _free(ptr: number): void;
  cwrap(
    ident: string,
    returnType: 'number' | 'string' | null,
    argTypes: Array<'number' | 'string'>
  ): (...args: number[]) => number | string | null;
  lengthBytesUTF8(value: string): number;
  stringToUTF8(value: string, outPtr: number, maxBytesToWrite: number): void;
  getValue(ptr: number, type: 'i32'): number;
}

type EmscriptenFactory = (opts?: {
  locateFile?: (fileName: string) => string;
}) => Promise<EmscriptenModuleLike> | EmscriptenModuleLike;

type CodecBinding = {
  jsFile: string;
  bundledJsUrl: string;
  bundledWasmUrl: string;
  decodeSymbol: string;
  decodeMemSymbol?: string;
  decode16Symbol?: string;
  decode16MemSymbol?: string;
  errorSymbol: string;
  freeSymbol: string;
  inputExt: string;
};

const DEFAULT_NATIVE_WASM_OPTIONS: NativeWasmOptions = {
  enabled: true,
  preferNative: true,
  baseUrl: '',
  codecs: ['heif', 'tiff', 'raw'],
};

let nativeWasmOptions: NativeWasmOptions = { ...DEFAULT_NATIVE_WASM_OPTIONS };
const moduleCache = new Map<NativeWasmCodec, Promise<EmscriptenModuleLike>>();

const CODEC_BINDINGS: Record<NativeWasmCodec, CodecBinding> = {
  heif: {
    jsFile: 'libheif/libheif.js',
    bundledJsUrl: bundledHeifJsUrl,
    bundledWasmUrl: bundledHeifWasmUrl,
    decodeSymbol: 'jt_heif_decode_rgba',
    decodeMemSymbol: 'jt_heif_decode_rgba_mem',
    decode16Symbol: 'jt_heif_decode_rgba16',
    decode16MemSymbol: 'jt_heif_decode_rgba16_mem',
    errorSymbol: 'jt_heif_last_error',
    freeSymbol: 'jt_heif_free',
    inputExt: 'heic',
  },
  tiff: {
    jsFile: 'libtiff/libtiff.js',
    bundledJsUrl: bundledLibtiffJsUrl,
    bundledWasmUrl: bundledLibtiffWasmUrl,
    decodeSymbol: 'jt_tiff_decode_rgba',
    decode16Symbol: 'jt_tiff_decode_rgba16',
    errorSymbol: 'jt_tiff_last_error',
    freeSymbol: 'jt_tiff_free',
    inputExt: 'tiff',
  },
  raw: {
    jsFile: 'libraw/libraw.js',
    bundledJsUrl: bundledLibrawJsUrl,
    bundledWasmUrl: bundledLibrawWasmUrl,
    decodeSymbol: 'jt_raw_decode_rgba',
    decode16Symbol: 'jt_raw_decode_rgba16',
    errorSymbol: 'jt_raw_last_error',
    freeSymbol: 'jt_raw_free',
    inputExt: 'raw',
  },
};

export function configureNativeWasm(options: Partial<NativeWasmOptions>): void {
  nativeWasmOptions = {
    ...nativeWasmOptions,
    ...options,
    codecs: options.codecs ? [...options.codecs] : nativeWasmOptions.codecs,
  };
  moduleCache.clear();
}

export function resetNativeWasmOptions(): void {
  nativeWasmOptions = { ...DEFAULT_NATIVE_WASM_OPTIONS };
  moduleCache.clear();
}

export function getNativeWasmOptions(): NativeWasmOptions {
  return { ...nativeWasmOptions };
}

function trimSlashes(input: string): string {
  return input.replace(/\/+$/, '');
}

function hasExternalBaseUrl(baseUrl: string): boolean {
  return trimSlashes(baseUrl).length > 0;
}

function getCodecUrlParts(codec: NativeWasmCodec): { jsUrl: string; dirUrl: string; external: boolean } {
  const binding = CODEC_BINDINGS[codec];
  const external = hasExternalBaseUrl(nativeWasmOptions.baseUrl);
  const jsUrl = external
    ? `${trimSlashes(nativeWasmOptions.baseUrl)}/${binding.jsFile}`
    : binding.bundledJsUrl;
  const dirUrl = jsUrl.slice(0, jsUrl.lastIndexOf('/'));
  return { jsUrl, dirUrl, external };
}

function toImportSpecifier(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (typeof window !== 'undefined') {
    return new URL(url, window.location.origin).href;
  }

  return url;
}

async function loadCodecModule(codec: NativeWasmCodec): Promise<EmscriptenModuleLike> {
  const cached = moduleCache.get(codec);
  if (cached) {
    return cached;
  }

  const loading = (async () => {
    const { jsUrl, dirUrl, external } = getCodecUrlParts(codec);
    const importSpecifier = toImportSpecifier(jsUrl);
    const imported = await import(/* @vite-ignore */ importSpecifier);
    const factoryCandidate = (imported as { default?: unknown }).default ?? imported;

    if (typeof factoryCandidate !== 'function') {
      throw new Error(`Invalid wasm module factory: ${jsUrl}`);
    }

    const factory = factoryCandidate as EmscriptenFactory;
    const binding = CODEC_BINDINGS[codec];
    return await factory({
      locateFile: (fileName: string) => {
        if (!external && fileName.endsWith('.wasm')) {
          return binding.bundledWasmUrl;
        }
        return `${dirUrl}/${fileName}`;
      },
    });
  })();

  moduleCache.set(codec, loading);
  return loading;
}

function writeCString(mod: EmscriptenModuleLike, value: string): number {
  const bytes = mod.lengthBytesUTF8(value) + 1;
  const ptr = mod._malloc(bytes);
  mod.stringToUTF8(value, ptr, bytes);
  return ptr;
}

function hasExportedFunction(mod: EmscriptenModuleLike, symbol: string): boolean {
  const exported = (mod as unknown as Record<string, unknown>)[`_${symbol}`];
  return typeof exported === 'function';
}

function getWrappedFunction(
  mod: EmscriptenModuleLike,
  symbol: string,
  returnType: 'number' | 'string' | null,
  argTypes: Array<'number' | 'string'>
): ((...args: number[]) => number | string | null) | null {
  if (!hasExportedFunction(mod, symbol)) {
    return null;
  }
  return mod.cwrap(symbol, returnType, argTypes) as (...args: number[]) => number | string | null;
}

function normalizeRgba16ToRgba8(rgba16: Uint16Array, bitDepth: number): Uint8ClampedArray {
  const safeDepth = Math.max(1, Math.min(16, bitDepth || 16));
  const maxValue = Math.pow(2, safeDepth) - 1;
  const scale = 255 / maxValue;
  const out = new Uint8ClampedArray(rgba16.length);
  for (let i = 0; i < rgba16.length; i++) {
    out[i] = Math.max(0, Math.min(255, Math.round(rgba16[i] * scale)));
  }
  return out;
}

function formatDecodeErrors(codec: NativeWasmCodec, mode: NativeDecodeMode, errors: Error[]): Error {
  if (errors.length === 1) {
    return errors[0];
  }

  const detail = errors
    .map((err, idx) => `#${idx + 1} ${err.message}`)
    .join('; ');
  return new Error(`${codec} native wasm decode failed (mode=${mode}): ${detail}`);
}

async function decodeRgba8WithModule(
  mod: EmscriptenModuleLike,
  codec: NativeWasmCodec,
  bytes: Uint8Array
): Promise<NativeDecodeResult> {
  const binding = CODEC_BINDINGS[codec];
  const decodePath = getWrappedFunction(
    mod,
    binding.decodeSymbol,
    'number',
    ['number', 'number', 'number', 'number']
  ) as ((a: number, b: number, c: number, d: number) => number) | null;

  const decodeMem = binding.decodeMemSymbol
    ? (getWrappedFunction(
      mod,
      binding.decodeMemSymbol,
      'number',
      ['number', 'number', 'number', 'number', 'number']
    ) as ((a: number, b: number, c: number, d: number, e: number) => number) | null)
    : null;

  if (!decodeMem && !decodePath) {
    throw new Error(`${codec} native wasm decode symbol not exported`);
  }

  const lastError = (
    mod.cwrap(binding.errorSymbol, 'string', [])
  ) as unknown as () => string | null;
  const freeOutput = (
    mod.cwrap(binding.freeSymbol, null, ['number'])
  ) as unknown as (ptr: number) => void;

  const outPtrPtr = mod._malloc(4);
  const widthPtr = mod._malloc(4);
  const heightPtr = mod._malloc(4);
  let inputPtr = 0;
  let pathPtr = 0;
  let inputPath = '';
  let shouldUnlink = false;

  try {
    let rc = -1;

    if (decodeMem) {
      inputPtr = mod._malloc(bytes.length);
      mod.HEAPU8.set(bytes, inputPtr);
      rc = decodeMem(inputPtr, bytes.length, outPtrPtr, widthPtr, heightPtr);
    } else {
      if (!mod.FS || typeof mod.FS.writeFile !== 'function') {
        throw new Error(
          `${codec} wasm module does not expose FS. Rebuild with FORCE_FILESYSTEM and export runtime method FS.`
        );
      }
      inputPath = `/tmp/${codec}-${Date.now()}-${Math.random().toString(16).slice(2)}.${binding.inputExt}`;
      mod.FS.writeFile(inputPath, bytes);
      shouldUnlink = true;
      pathPtr = writeCString(mod, inputPath);
      rc = decodePath!(pathPtr, outPtrPtr, widthPtr, heightPtr);
    }

    if (rc !== 0) {
      const msg = (lastError() as string | null) || `${codec} native decode failed`;
      throw new Error(msg);
    }

    const width = mod.getValue(widthPtr, 'i32');
    const height = mod.getValue(heightPtr, 'i32');
    const outPtr = mod.getValue(outPtrPtr, 'i32');

    if (width <= 0 || height <= 0 || outPtr <= 0) {
      throw new Error(`${codec} native decoder returned invalid dimensions`);
    }

    const byteSize = width * height * 4;
    const rgba = new Uint8ClampedArray(mod.HEAPU8.slice(outPtr, outPtr + byteSize));
    freeOutput(outPtr);

    return {
      width,
      height,
      rgba,
      backend: `${codec}-native-wasm-rgba8`,
      decodeMode: 'rgba8',
      bitDepth: 8,
    };
  } finally {
    if (inputPtr) {
      mod._free(inputPtr);
    }
    if (pathPtr) {
      mod._free(pathPtr);
    }
    mod._free(outPtrPtr);
    mod._free(widthPtr);
    mod._free(heightPtr);
    if (shouldUnlink && mod.FS) {
      try {
        mod.FS.unlink(inputPath);
      } catch {
        // ignore FS cleanup failures
      }
    }
  }
}

async function decodeRgba16WithModule(
  mod: EmscriptenModuleLike,
  codec: NativeWasmCodec,
  bytes: Uint8Array
): Promise<NativeDecodeResult> {
  const binding = CODEC_BINDINGS[codec];

  if (!binding.decode16Symbol) {
    throw new Error(`${codec} native wasm does not define rgba16 decoder`);
  }

  const decodePath16 = getWrappedFunction(
    mod,
    binding.decode16Symbol,
    'number',
    ['number', 'number', 'number', 'number', 'number']
  ) as ((a: number, b: number, c: number, d: number, e: number) => number) | null;

  const decodeMem16 = binding.decode16MemSymbol
    ? (getWrappedFunction(
      mod,
      binding.decode16MemSymbol,
      'number',
      ['number', 'number', 'number', 'number', 'number', 'number']
    ) as ((a: number, b: number, c: number, d: number, e: number, f: number) => number) | null)
    : null;

  if (!decodeMem16 && !decodePath16) {
    throw new Error(`${codec} native wasm rgba16 decode symbol not exported`);
  }

  const lastError = (
    mod.cwrap(binding.errorSymbol, 'string', [])
  ) as unknown as () => string | null;
  const freeOutput = (
    mod.cwrap(binding.freeSymbol, null, ['number'])
  ) as unknown as (ptr: number) => void;

  const outPtrPtr = mod._malloc(4);
  const widthPtr = mod._malloc(4);
  const heightPtr = mod._malloc(4);
  const bitDepthPtr = mod._malloc(4);
  let inputPtr = 0;
  let pathPtr = 0;
  let inputPath = '';
  let shouldUnlink = false;

  try {
    let rc = -1;

    if (decodeMem16) {
      inputPtr = mod._malloc(bytes.length);
      mod.HEAPU8.set(bytes, inputPtr);
      rc = decodeMem16(inputPtr, bytes.length, outPtrPtr, widthPtr, heightPtr, bitDepthPtr);
    } else {
      if (!mod.FS || typeof mod.FS.writeFile !== 'function') {
        throw new Error(
          `${codec} wasm module does not expose FS. Rebuild with FORCE_FILESYSTEM and export runtime method FS.`
        );
      }
      inputPath = `/tmp/${codec}-${Date.now()}-${Math.random().toString(16).slice(2)}.${binding.inputExt}`;
      mod.FS.writeFile(inputPath, bytes);
      shouldUnlink = true;
      pathPtr = writeCString(mod, inputPath);
      rc = decodePath16!(pathPtr, outPtrPtr, widthPtr, heightPtr, bitDepthPtr);
    }

    if (rc !== 0) {
      const msg = (lastError() as string | null) || `${codec} native rgba16 decode failed`;
      throw new Error(msg);
    }

    const width = mod.getValue(widthPtr, 'i32');
    const height = mod.getValue(heightPtr, 'i32');
    const outPtr = mod.getValue(outPtrPtr, 'i32');
    const bitDepth = mod.getValue(bitDepthPtr, 'i32');

    if (width <= 0 || height <= 0 || outPtr <= 0) {
      throw new Error(`${codec} native rgba16 decoder returned invalid dimensions`);
    }

    const sampleCount = width * height * 4;
    const start = outPtr >>> 1;
    const rgba16 = mod.HEAPU16.slice(start, start + sampleCount);
    const rgba = normalizeRgba16ToRgba8(rgba16, bitDepth);
    freeOutput(outPtr);

    return {
      width,
      height,
      rgba,
      backend: `${codec}-native-wasm-rgba16`,
      decodeMode: 'rgba16',
      bitDepth: Math.max(1, bitDepth || 16),
    };
  } finally {
    if (inputPtr) {
      mod._free(inputPtr);
    }
    if (pathPtr) {
      mod._free(pathPtr);
    }
    mod._free(outPtrPtr);
    mod._free(widthPtr);
    mod._free(heightPtr);
    mod._free(bitDepthPtr);
    if (shouldUnlink && mod.FS) {
      try {
        mod.FS.unlink(inputPath);
      } catch {
        // ignore FS cleanup failures
      }
    }
  }
}

export async function decodeWithNativeWasm(
  codec: NativeWasmCodec,
  blob: Blob,
  request: NativeDecodeRequest = {}
): Promise<NativeDecodeResult | null> {
  if (!nativeWasmOptions.enabled || !nativeWasmOptions.preferNative) {
    return null;
  }
  if (!nativeWasmOptions.codecs.includes(codec)) {
    return null;
  }

  const mode = request.mode ?? 'auto';
  const fallbackToRgba8 = request.fallbackToRgba8 ?? true;

  const mod = await loadCodecModule(codec);
  const bytes = new Uint8Array(await blob.arrayBuffer());

  const errors: Error[] = [];

  if (mode === 'rgba16') {
    try {
      return await decodeRgba16WithModule(mod, codec, bytes);
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
      if (!fallbackToRgba8) {
        throw errors[0];
      }
    }
  }

  try {
    return await decodeRgba8WithModule(mod, codec, bytes);
  } catch (error) {
    errors.push(error instanceof Error ? error : new Error(String(error)));
    throw formatDecodeErrors(codec, mode, errors);
  }
}
