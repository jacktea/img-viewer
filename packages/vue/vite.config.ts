import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import obfuscator from 'rollup-plugin-obfuscator';

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
        plugins: [
          obfuscator({
            global: true,
            options: {
              compact: true,
              controlFlowFlattening: false,
              deadCodeInjection: false,
              debugProtection: false,
              disableConsoleOutput: false,
              identifierNamesGenerator: 'hexadecimal',
              log: false,
              numbersToExpressions: false,
              renameGlobals: false,
              rotateStringArray: true,
              selfDefending: false,
              shuffleStringArray: true,
              splitStrings: false,
              stringArray: true,
              stringArrayEncoding: [],
              stringArrayThreshold: 0.75,
              unicodeEscapeSequence: false
            }
          })
        ]
      },
    },
  },
});
