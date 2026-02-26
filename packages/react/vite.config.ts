import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import obfuscator from 'rollup-plugin-obfuscator';

export default defineConfig({
  plugins: [
    react(),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ImgViewerReact',
      fileName: 'img-viewer-react',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', '@jacktea/img-viewer'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
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
