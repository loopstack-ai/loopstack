export interface HubConfig {
  authCallback: string;
  clientId: string;
  clientSecret: string;
  timeout?: number;
  retries?: number;
  cacheEnabled?: boolean;
  cacheTtlSeconds?: number;
}

export interface RequestContext {
  correlationId: string;
  requestId?: string;
  userId?: string;
  clientIp?: string;
  userAgent?: string;
}