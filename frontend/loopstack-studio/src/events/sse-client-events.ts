export const SseClientEvents = {
  WORKFLOW_CREATED: 'workflow.created',
  WORKFLOW_UPDATED: 'workflow.updated',
  DOCUMENT_CREATED: 'document.created',
} as const;
export type SseClientEvents = (typeof SseClientEvents)[keyof typeof SseClientEvents];