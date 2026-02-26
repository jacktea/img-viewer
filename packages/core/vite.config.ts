import { defineConfig } from 'vite';
import { resolve } from 'path';
import obfuscator from 'rollup-plugin-obfuscator';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ImgViewer',
      fileName: 'img-viewer',
    },
    cssCodeSplit: false,
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
});
