import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
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
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ImgViewerVue',
      fileName: 'img-viewer-vue',
    },
    rollupOptions: {
      external: ['vue', '@jacktea/img-viewer'],
      output: {
        globals: {
          vue: 'Vue',
          '@jacktea/img-viewer': 'ImgViewer',
        },
      },
    },
  },
});
