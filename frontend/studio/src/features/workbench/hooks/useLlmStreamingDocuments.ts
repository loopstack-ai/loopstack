import { useEffect, useMemo, useRef, useState } from 'react';
import type { DocumentItemInterface, UIContentBlock, UIMessage } from '@loopstack/contracts/types';
import { SseClientEvents } from '@/events';
import { eventBus } from '@/services';

interface LlmStreamPayload {
  workflowId?: string;
  messageId?: string;
  delta?: string;
  error?: string;
  id?: string;
  name?: string;
  args?: Record<string, unknown>;
  message?: UIMessage;
}

interface StreamingMessageState {
  messageId: string;
  text: string;
  thinking: string;
  toolCalls: Extract<UIContentBlock, { type: 'tool_call' }>[];
  completed: boolean;
  readyForFinal: boolean;
  error?: string;
}

const WORD_DRAIN_INTERVAL_MS = 35;

function takeNextWord(value: string): { word: string; remaining: string } {
  const match = value.match(/^(\s*\S+\s*)/);
  const word = match?.[0] ?? value.slice(0, 1);
  return { word, remaining: value.slice(word.length) };
}

function createStreamingDocument(
  workflowId: string,
  place: string,
  state: StreamingMessageState,
): DocumentItemInterface {
  const content: UIContentBlock[] = [];

  if (state.thinking) {
    content.push({ type: 'thinking', text: state.thinking });
  }

  content.push({ type: 'text', text: state.error ? `Error while streaming response: ${state.error}` : state.text });
  content.push(...state.toolCalls);

  const now = new Date();

  return {
    id: `streaming-${state.messageId}`,
    name: 'llm_message',
    alias: 'llm_message',
    content: {
      id: state.messageId,
      role: 'assistant',
      content,
    },
    validationError: null,
    meta: { streaming: !state.readyForFinal && !state.error, streamReadyForFinal: state.readyForFinal },
    isInvalidated: false,
    isPendingRemoval: false,
    version: 0,
    index: Number.MAX_SAFE_INTEGER,
    transition: null,
    place,
    labels: [],
    tags: ['message'],
    createdAt: now,
    updatedAt: now,
    workspaceId: '',
    workflowId,
  };
}

export function useLlmStreamingDocuments(workflowId: string, place: string | undefined): DocumentItemInterface[] {
  const [streams, setStreams] = useState<Record<string, StreamingMessageState>>({});
  const pendingDeltas = useRef<Record<string, { text: string; thinking: string }>>({});
  const drainTimeout = useRef<number | null>(null);

  useEffect(() => {
    function scheduleDrain() {
      if (drainTimeout.current !== null) return;

      drainTimeout.current = window.setTimeout(() => {
        drainTimeout.current = null;
        drainPending();
      }, WORD_DRAIN_INTERVAL_MS);
    }

    function drainPending(messageId?: string) {
      const entries = Object.entries(pendingDeltas.current).filter(([key]) => !messageId || key === messageId);
      if (!entries.length) return;

      const updates: Record<string, { text: string; thinking: string }> = {};

      for (const [key, delta] of entries) {
        updates[key] = { text: '', thinking: '' };

        if (delta.thinking) {
          const drained = takeNextWord(delta.thinking);
          updates[key].thinking = drained.word;
          delta.thinking = drained.remaining;
        } else if (delta.text) {
          const drained = takeNextWord(delta.text);
          updates[key].text = drained.word;
          delta.text = drained.remaining;
        }

        if (!delta.text && !delta.thinking) {
          delete pendingDeltas.current[key];
        }
      }

      const hasMore = Object.values(pendingDeltas.current).some((delta) => delta.text || delta.thinking);

      setStreams((current) => {
        const next = { ...current };
        for (const [key, update] of Object.entries(updates)) {
          const existing = next[key] ?? {
            messageId: key,
            text: '',
            thinking: '',
            toolCalls: [],
            completed: false,
            readyForFinal: false,
          };

          const isDrained = !pendingDeltas.current[key]?.text && !pendingDeltas.current[key]?.thinking;

          next[key] = {
            ...existing,
            text: existing.text + update.text,
            thinking: existing.thinking + update.thinking,
            readyForFinal: existing.completed && isDrained,
          };
        }
        return next;
      });

      if (hasMore) {
        scheduleDrain();
      }
    }

    function queueDelta(payload: LlmStreamPayload, field: 'text' | 'thinking') {
      if (payload.workflowId !== workflowId || !payload.messageId || !payload.delta) return;

      const pending = pendingDeltas.current[payload.messageId] ?? { text: '', thinking: '' };
      pending[field] += payload.delta;
      pendingDeltas.current[payload.messageId] = pending;
      scheduleDrain();
    }

    function updateStream(
      payload: LlmStreamPayload,
      updater: (current: StreamingMessageState) => StreamingMessageState,
    ) {
      if (payload.workflowId !== workflowId || !payload.messageId) return;

      setStreams((current) => ({
        ...current,
        [payload.messageId!]: updater(
          current[payload.messageId!] ?? {
            messageId: payload.messageId!,
            text: '',
            thinking: '',
            toolCalls: [],
            completed: false,
            readyForFinal: false,
          },
        ),
      }));
    }

    const unsubStart = eventBus.on(SseClientEvents.LLM_RESPONSE_START, (payload: LlmStreamPayload) => {
      updateStream(payload, (current) => ({ ...current, completed: false, readyForFinal: false, error: undefined }));
    });

    const unsubText = eventBus.on(SseClientEvents.LLM_RESPONSE_TEXT_DELTA, (payload: LlmStreamPayload) => {
      queueDelta(payload, 'text');
    });

    const unsubThinking = eventBus.on(SseClientEvents.LLM_RESPONSE_THINKING_DELTA, (payload: LlmStreamPayload) => {
      queueDelta(payload, 'thinking');
    });

    const unsubTool = eventBus.on(SseClientEvents.LLM_RESPONSE_TOOL_CALL, (payload: LlmStreamPayload) => {
      updateStream(payload, (current) => ({
        ...current,
        toolCalls: payload.id
          ? [
              ...current.toolCalls,
              { type: 'tool_call', id: payload.id, name: payload.name ?? 'tool', args: payload.args ?? {} },
            ]
          : current.toolCalls,
      }));
    });

    const unsubDone = eventBus.on(SseClientEvents.LLM_RESPONSE_DONE, (payload: LlmStreamPayload) => {
      updateStream(payload, (current) => ({
        ...current,
        completed: true,
        readyForFinal: !payload.messageId || !pendingDeltas.current[payload.messageId],
      }));
    });

    const unsubError = eventBus.on(SseClientEvents.LLM_RESPONSE_ERROR, (payload: LlmStreamPayload) => {
      updateStream(payload, (current) => ({ ...current, completed: true, error: payload.error ?? 'Unknown error' }));
    });

    return () => {
      unsubStart();
      unsubText();
      unsubThinking();
      unsubTool();
      unsubDone();
      unsubError();
      if (drainTimeout.current !== null) {
        window.clearTimeout(drainTimeout.current);
        drainTimeout.current = null;
      }
      pendingDeltas.current = {};
    };
  }, [workflowId]);

  return useMemo(
    () => Object.values(streams).map((state) => createStreamingDocument(workflowId, place ?? '', state)),
    [place, streams, workflowId],
  );
}
