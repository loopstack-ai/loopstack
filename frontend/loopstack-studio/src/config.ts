import type { Environment } from './types';

const config = {
  apiBaseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  environment: {
    id: 'local',
    name: 'Local Environment',
    url: 'http://localhost:8000'
  } as Environment
};

export default config;
