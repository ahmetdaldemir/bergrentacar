/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_GOOGLE_PLACE_ID: string;
  readonly VITE_GOOGLE_ADS_CONVERSION_LABEL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
