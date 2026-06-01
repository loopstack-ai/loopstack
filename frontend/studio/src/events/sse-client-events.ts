export const SseClientEvents = {
  WORKFLOW_CREATED: 'workflow.created',
  WORKFLOW_UPDATED: 'workflow.updated',
  DOCUMENT_CREATED: 'document.created',
  SSE_CONNECTED: 'sse.connected',
  LLM_RESPONSE_START: 'llm.response.start',
  LLM_RESPONSE_TEXT_DELTA: 'llm.response.text_delta',
  LLM_RESPONSE_THINKING_DELTA: 'llm.response.thinking_delta',
  LLM_RESPONSE_TOOL_CALL: 'llm.response.tool_call',
  LLM_RESPONSE_DONE: 'llm.response.done',
  LLM_RESPONSE_ERROR: 'llm.response.error',
} as const;
export type SseClientEvents = (typeof SseClientEvents)[keyof typeof SseClientEvents];
