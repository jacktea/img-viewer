import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === 'img-viewer',
        },
      },
    }),
    react(),
  ],
  resolve: {
    alias: {
      // 开发模式直接引用源码，无需单独编译
      '@jacktea/img-viewer': resolve(__dirname, '../packages/core/src/index.ts'),
      '@jacktea/img-viewer-vue': resolve(__dirname, '../packages/vue/src/index.ts'),
      '@jacktea/img-viewer-react': resolve(__dirname, '../packages/react/src/index.ts'),
    },
  },
  server: {
    port: 5174,
    open: true,
    headers: {
      // 'Cross-Origin-Opener-Policy': 'same-origin',
      // 'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  preview: {
    headers: {
      // 'Cross-Origin-Opener-Policy': 'same-origin',
      // 'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  worker: {
    format: 'es',
  },
});
