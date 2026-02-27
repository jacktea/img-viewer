/// <reference types="vite/client" />

declare module '*.css?inline' {
  const content: string;
  export default content;
}

declare module '*.js' {
  const factory: (opts?: { locateFile?: (fileName: string) => string }) => unknown;
  export default factory;
}
