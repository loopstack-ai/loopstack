import type { LlmNormalizedMessage, LlmResponseEvent } from '@loopstack/contracts/events';

export interface LlmMessageStreamState {
  messageId: string;
  workflowId: string;
  text: string;
  thinking: string;
  toolCalls: { id: string; name: string; args: Record<string, unknown> }[];
  completed: boolean;
  /** The full normalized message, present once `llm.response.done` arrived. */
  message?: LlmNormalizedMessage;
  error?: string;
}

export type LlmStreamState = Record<string, LlmMessageStreamState>;

function emptyMessageState(event: LlmResponseEvent): LlmMessageStreamState {
  return {
    messageId: event.messageId,
    workflowId: event.workflowId,
    text: '',
    thinking: '',
    toolCalls: [],
    completed: false,
  };
}

/**
 * Pure reducer accumulating `llm.response.*` events into per-message stream
 * state. Presentation concerns (typewriter animations, document synthesis)
 * belong to the consumer.
 */
export function reduceLlmStream(state: LlmStreamState, event: LlmResponseEvent): LlmStreamState {
  const current = state[event.messageId] ?? emptyMessageState(event);

  switch (event.type) {
    case 'llm.response.start':
      return { ...state, [event.messageId]: { ...current, completed: false, error: undefined } };
    case 'llm.response.text_delta':
      return { ...state, [event.messageId]: { ...current, text: current.text + event.delta } };
    case 'llm.response.thinking_delta':
      return { ...state, [event.messageId]: { ...current, thinking: current.thinking + event.delta } };
    case 'llm.response.tool_call':
      return {
        ...state,
        [event.messageId]: {
          ...current,
          toolCalls: [...current.toolCalls, { id: event.id, name: event.name, args: event.args }],
        },
      };
    case 'llm.response.done':
      return { ...state, [event.messageId]: { ...current, completed: true, message: event.message } };
    case 'llm.response.error':
      return { ...state, [event.messageId]: { ...current, completed: true, error: event.error } };
  }
}
