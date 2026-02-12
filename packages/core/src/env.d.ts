/// <reference types="vite/client" />

declare module '*.css?inline' {
  const content: string;
  export default content;
}

declare module 'libheif-js/libheif-wasm/libheif-bundle.mjs' {
  const value: unknown;
  export default value;
}

declare module 'libraw-wasm' {
  export default class LibRaw {
    worker?: {
      terminate?: () => void;
    };
    open(buffer: Uint8Array, settings?: Record<string, unknown>): Promise<unknown>;
    metadata(fullOutput?: boolean): Promise<unknown>;
    imageData(): Promise<unknown>;
  }
}
