import type { Environment } from './types';

const config = {
  environment: {
    id: 'local',
    name: 'Local Environment',
    url: 'http://localhost:8000',
  } as Environment,
};

export default config;
