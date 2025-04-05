/// <reference types="vite/client" />
interface ImportMetaEnv {
    readonly VITE_RSS_FLIGHT_SERVER_URL: string;
    readonly VITE_RSS_MQTT_URL: string;
    readonly VITE_RSS_FLIGHT_SERVER_SCOPE: string;
    readonly VITE_MSAL_TENANT_ID: string;
    readonly VITE_MSAL_CLIENT_ID: string;
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }