import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ImgViewer',
      fileName: 'img-viewer',
    },
    rollupOptions: {
      external: ['magickwand.js'],
      output: {
        globals: {
          'magickwand.js': 'MagickWandJS',
        },
      },
    },
    cssCodeSplit: false,
  },
});
