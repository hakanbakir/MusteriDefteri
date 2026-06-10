/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string;
}

declare module "*.png" {
  const src: string;
  export default src;
}

