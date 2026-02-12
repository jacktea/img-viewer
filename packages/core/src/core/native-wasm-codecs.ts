import bundledHeifJsUrl from '../wasm/libheif/libheif.js?url';
import bundledHeifWasmUrl from '../wasm/libheif/libheif.wasm?url';
import bundledLibrawJsUrl from '../wasm/libraw/libraw.js?url';
import bundledLibrawWasmUrl from '../wasm/libraw/libraw.wasm?url';
import bundledLibtiffJsUrl from '../wasm/libtiff/libtiff.js?url';
import bundledLibtiffWasmUrl from '../wasm/libtiff/libtiff.wasm?url';

export type NativeWasmCodec = 'heif' | 'tiff' | 'raw';

export interface NativeWasmOptions {
  enabled: boolean;
  preferNative: boolean;
  // Optional external base URL. Empty string means use bundled assets from core.
  baseUrl: string;
  codecs: NativeWasmCodec[];
}

export interface NativeDecodeResult {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  backend: string;
}

interface EmscriptenFs {
  writeFile(path: string, data: Uint8Array): void;
  unlink(path: string): void;
}

interface EmscriptenModuleLike {
  FS: EmscriptenFs;
  HEAPU8: Uint8Array;
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
    errorSymbol: 'jt_heif_last_error',
    freeSymbol: 'jt_heif_free',
    inputExt: 'heic',
  },
  tiff: {
    jsFile: 'libtiff/libtiff.js',
    bundledJsUrl: bundledLibtiffJsUrl,
    bundledWasmUrl: bundledLibtiffWasmUrl,
    decodeSymbol: 'jt_tiff_decode_rgba',
    errorSymbol: 'jt_tiff_last_error',
    freeSymbol: 'jt_tiff_free',
    inputExt: 'tiff',
  },
  raw: {
    jsFile: 'libraw/libraw.js',
    bundledJsUrl: bundledLibrawJsUrl,
    bundledWasmUrl: bundledLibrawWasmUrl,
    decodeSymbol: 'jt_raw_decode_rgba',
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

export async function decodeWithNativeWasm(
  codec: NativeWasmCodec,
  blob: Blob
): Promise<NativeDecodeResult | null> {
  if (!nativeWasmOptions.enabled || !nativeWasmOptions.preferNative) {
    return null;
  }
  if (!nativeWasmOptions.codecs.includes(codec)) {
    return null;
  }

  const mod = await loadCodecModule(codec);
  const binding = CODEC_BINDINGS[codec];
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const inputPath = `/tmp/${codec}-${Date.now()}-${Math.random().toString(16).slice(2)}.${binding.inputExt}`;

  const decode = (
    mod.cwrap(binding.decodeSymbol, 'number', ['number', 'number', 'number', 'number'])
  ) as unknown as (a: number, b: number, c: number, d: number) => number;
  const lastError = (
    mod.cwrap(binding.errorSymbol, 'string', [])
  ) as unknown as () => string | null;
  const freeOutput = (
    mod.cwrap(binding.freeSymbol, null, ['number'])
  ) as unknown as (ptr: number) => void;
  const outPtrPtr = mod._malloc(4);
  const widthPtr = mod._malloc(4);
  const heightPtr = mod._malloc(4);
  let pathPtr = 0;
  let inputPtr = 0;
  let shouldUnlink = false;

  try {
    let rc = -1;
    if (codec === 'heif') {
      try {
        const decodeMem = mod.cwrap(
          'jt_heif_decode_rgba_mem',
          'number',
          ['number', 'number', 'number', 'number', 'number']
        ) as unknown as (a: number, b: number, c: number, d: number, e: number) => number;

        inputPtr = mod._malloc(bytes.length);
        mod.HEAPU8.set(bytes, inputPtr);
        rc = decodeMem(inputPtr, bytes.length, outPtrPtr, widthPtr, heightPtr);
      } catch {
        // Compat with older heif builds that only expose path-based API.
        if (!mod.FS || typeof mod.FS.writeFile !== 'function') {
          throw new Error('heif wasm module missing memory and FS decode entrypoints');
        }
        mod.FS.writeFile(inputPath, bytes);
        shouldUnlink = true;
        pathPtr = writeCString(mod, inputPath);
        rc = decode(pathPtr, outPtrPtr, widthPtr, heightPtr);
      }
    } else {
      if (!mod.FS || typeof mod.FS.writeFile !== 'function') {
        throw new Error(
          `${codec} wasm module does not expose FS. Rebuild with FORCE_FILESYSTEM and export runtime method FS.`
        );
      }
      mod.FS.writeFile(inputPath, bytes);
      shouldUnlink = true;
      pathPtr = writeCString(mod, inputPath);
      rc = decode(pathPtr, outPtrPtr, widthPtr, heightPtr);
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
      backend: `${codec}-native-wasm`,
    };
  } finally {
    if (pathPtr) {
      mod._free(pathPtr);
    }
    if (inputPtr) {
      mod._free(inputPtr);
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
