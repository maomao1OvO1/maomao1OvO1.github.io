/// <reference types="vite/client" />

declare module '*.sgf?raw' {
  const content: string;
  export default content;
}

declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;
declare const __APP_COMMIT_DATE__: string;
