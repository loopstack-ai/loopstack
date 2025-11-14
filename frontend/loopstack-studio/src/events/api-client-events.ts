export const ApiClientEvents = {
  UNAUTHORIZED: 'api.unauthorized',
  ERR_NETWORK: 'api.ERR_NETWORK'
} as const;

export const SseClientEvents = {
  WORKFLOW_CREATED: 'workflow.created',
  WORKFLOW_UPDATED: 'workflow.updated',
  DOCUMENT_CREATED: 'document.created'
} as const;

export type ApiClientEvents = (typeof ApiClientEvents)[keyof typeof ApiClientEvents];
export type SseClientEvents = (typeof SseClientEvents)[keyof typeof SseClientEvents];
