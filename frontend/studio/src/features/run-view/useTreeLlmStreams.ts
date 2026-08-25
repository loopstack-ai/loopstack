import { useEffect, useMemo, useState } from 'react';
import { reduceLlmStream } from '@loopstack/client';
import type { LlmMessageStreamState, LlmStreamState } from '@loopstack/client';
import type { DocumentItemInterface } from '@loopstack/contracts/api';
import { isLlmResponseEvent } from '@loopstack/contracts/events';
import { useLoopstackClient } from '@loopstack/react';

/**
 * Accumulates `llm.response.*` events for every workflow of the run tree — the
 * tree-wide counterpart of the SDK's single-workflow `useLlmStream`, keyed by
 * workflowId. Changing the root resets the state.
 */
export function useTreeLlmStreams(workflowIds: string[]): Record<string, LlmStreamState> {
  const client = useLoopstackClient();
  const [state, setState] = useState<Record<string, LlmStreamState>>({});
  const idsKey = workflowIds.join(',');

  useEffect(() => {
    const ids = new Set(idsKey.split(',').filter(Boolean));
    return client.stream.onAny((message) => {
      if (!('userId' in message)) return;
      if (!isLlmResponseEvent(message)) return;
      if (!ids.has(message.workflowId)) return;
      setState((previous) => ({
        ...previous,
        [message.workflowId]: reduceLlmStream(previous[message.workflowId] ?? {}, message),
      }));
    });
  }, [client, idsKey]);

  return state;
}

function getLlmMessageId(document: DocumentItemInterface): string | undefined {
  const content = document.content as { id?: unknown } | undefined;
  return document.documentName === 'llm_message' && typeof content?.id === 'string' ? content.id : undefined;
}

function toStreamingDocument(workflowId: string, place: string, stream: LlmMessageStreamState): DocumentItemInterface {
  const text = stream.error ? `Error while streaming response: ${stream.error}` : stream.text;
  const blocks = [
    ...(stream.thinking ? [{ type: 'thinking', text: stream.thinking }] : []),
    { type: 'text', text },
    ...stream.toolCalls.map((call) => ({ type: 'tool_call', ...call })),
  ];
  const now = new Date().toISOString();
  return {
    id: `streaming-${stream.messageId}`,
    documentName: 'llm_message',
    content: { id: stream.messageId, role: 'assistant', text, blocks },
    validationError: null,
    meta: { streaming: !stream.completed && !stream.error },
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
  } as DocumentItemInterface;
}

/**
 * Merges a node's persisted documents with synthetic documents for its in-flight LLM
 * messages: a stream renders until the persisted `llm_message` with the same message id
 * lands, which then replaces it (no typewriter — tokens render as they arrive).
 */
export function mergeStreamingDocuments(
  workflowId: string,
  place: string | null,
  documents: DocumentItemInterface[],
  streams: LlmStreamState | undefined,
): DocumentItemInterface[] {
  const messageStreams = Object.values(streams ?? {});
  if (messageStreams.length === 0) return documents;

  const persistedMessageIds = new Set(documents.map(getLlmMessageId).filter((id): id is string => !!id));
  const streaming = messageStreams
    .filter((stream) => !persistedMessageIds.has(stream.messageId))
    .map((stream) => toStreamingDocument(workflowId, place ?? '', stream));
  return streaming.length > 0 ? [...documents, ...streaming] : documents;
}

/** Hook form of the merge for a whole tree of nodes. */
export function useStreamingNodes<T extends { workflowId: string; documents: DocumentItemInterface[] }>(
  nodes: (T & { workflow: { place?: string | null } })[],
): T[] {
  const streams = useTreeLlmStreams(nodes.map((node) => node.workflowId));
  return useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        documents: mergeStreamingDocuments(
          node.workflowId,
          node.workflow.place ?? null,
          node.documents,
          streams[node.workflowId],
        ),
      })),
    [nodes, streams],
  );
}
