import { useEffect, useMemo, useRef, useState } from 'react';
import type { LlmMessageStreamState } from '@loopstack/client';
import type { DocumentItemInterface, UIContentBlock } from '@loopstack/contracts/types';
import { useLlmStream } from '@loopstack/react';

/** How much of a message the typewriter has revealed so far. */
interface RevealedState {
  text: string;
  thinking: string;
}

const WORD_DRAIN_INTERVAL_MS = 35;

function takeNextWord(value: string): string {
  const match = value.match(/^(\s*\S+\s*)/);
  return match?.[0] ?? value.slice(0, 1);
}

function isFullyRevealed(stream: LlmMessageStreamState, revealed: RevealedState | undefined): boolean {
  return (
    (revealed?.text.length ?? 0) >= stream.text.length && (revealed?.thinking.length ?? 0) >= stream.thinking.length
  );
}

function createStreamingDocument(
  workflowId: string,
  place: string,
  stream: LlmMessageStreamState,
  revealed: RevealedState | undefined,
): DocumentItemInterface {
  const readyForFinal = stream.completed && isFullyRevealed(stream, revealed);
  const blocks: UIContentBlock[] = [];

  const thinking = revealed?.thinking ?? '';
  if (thinking) {
    blocks.push({ type: 'thinking', text: thinking });
  }

  const text = stream.error ? `Error while streaming response: ${stream.error}` : (revealed?.text ?? '');
  blocks.push({ type: 'text', text });
  blocks.push(...stream.toolCalls.map((call) => ({ type: 'tool_call', ...call }) as UIContentBlock));

  const now = new Date().toISOString();

  return {
    id: `streaming-${stream.messageId}`,
    documentName: 'llm_message',
    content: {
      id: stream.messageId,
      role: 'assistant',
      text,
      blocks,
    },
    validationError: null,
    meta: { streaming: !readyForFinal && !stream.error, streamReadyForFinal: readyForFinal },
    isInvalidated: false,
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

/**
 * Synthesizes streaming placeholder documents for a run's in-flight LLM
 * messages. The SDK accumulates the raw stream; this hook adds the
 * presentation layer — a word-by-word typewriter reveal — and maps each
 * message to a `llm_message` document that the persisted one replaces once
 * fully revealed (`meta.streamReadyForFinal`).
 */
export function useLlmStreamingDocuments(workflowId: string, place: string | undefined): DocumentItemInterface[] {
  const streams = useLlmStream(workflowId);
  const [revealed, setRevealed] = useState<Record<string, RevealedState>>({});
  const drainTimeout = useRef<number | null>(null);

  useEffect(() => {
    setRevealed({});
  }, [workflowId]);

  useEffect(() => {
    const hasPending = Object.values(streams).some((stream) => !isFullyRevealed(stream, revealed[stream.messageId]));
    if (!hasPending || drainTimeout.current !== null) return;

    drainTimeout.current = window.setTimeout(() => {
      drainTimeout.current = null;
      setRevealed((current) => {
        const next = { ...current };
        for (const stream of Object.values(streams)) {
          const visible = next[stream.messageId] ?? { text: '', thinking: '' };
          if (visible.thinking.length < stream.thinking.length) {
            const word = takeNextWord(stream.thinking.slice(visible.thinking.length));
            next[stream.messageId] = { ...visible, thinking: visible.thinking + word };
          } else if (visible.text.length < stream.text.length) {
            const word = takeNextWord(stream.text.slice(visible.text.length));
            next[stream.messageId] = { ...visible, text: visible.text + word };
          }
        }
        return next;
      });
    }, WORD_DRAIN_INTERVAL_MS);

    return () => {
      if (drainTimeout.current !== null) {
        window.clearTimeout(drainTimeout.current);
        drainTimeout.current = null;
      }
    };
  }, [streams, revealed]);

  return useMemo(
    () =>
      Object.values(streams).map((stream) =>
        createStreamingDocument(workflowId, place ?? '', stream, revealed[stream.messageId]),
      ),
    [place, streams, revealed, workflowId],
  );
}
