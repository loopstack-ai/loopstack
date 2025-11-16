export const ApiClientEvents = {
  UNAUTHORIZED: 'api.unauthorized',
  ERR_NETWORK: 'api.ERR_NETWORK'
} as const;

export type ApiClientEvents = (typeof ApiClientEvents)[keyof typeof ApiClientEvents];
