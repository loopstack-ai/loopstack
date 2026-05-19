import type { Environment } from './types';

declare global {
  interface Window {
    __LOOPSTACK_CONFIG__?: {
      apiUrl?: string;
    };
  }
}

const apiUrl =
  window.__LOOPSTACK_CONFIG__?.apiUrl ??
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:3000';

const config = {
  environment: {
    id: 'local',
    name: 'Local Environment',
    url: apiUrl,
  } as Environment,
};

export default config;
