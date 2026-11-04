import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'online.novaagencian8n.mais1km',
  appName: '+1 KM',
  webDir: 'dist',
  plugins: {
    // fetch/XHR nativos evitam CORS do WebView para a API externa.
    CapacitorHttp: {
      enabled: true,
    },
    // Mantém cookies nativos persistentes entre o WebView e as chamadas HTTP.
    // O cookie de sessão HttpOnly continua inacessível ao JavaScript.
    CapacitorCookies: {
      enabled: true,
    },
  },
};

export default config;
