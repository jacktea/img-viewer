import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@jacktea/img-viewer': resolve(__dirname, '../../packages/core/src/index.ts'),
    },
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    // libraw-wasm 使用 worker + wasm 资源，预构建后会破坏资源定位
    exclude: ['libraw-wasm', 'libheif-js'],
  },
  build: {
    target: 'esnext',
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
