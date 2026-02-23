import type { Environment } from './types';

const config = {
  environment: {
    id: 'local',
    name: 'Local Environment',
    url: (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000',
  } as Environment,
};

export default config;
