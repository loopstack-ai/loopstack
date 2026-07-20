import { useEffect, useState } from 'react';
import { reduceLlmStream } from '@loopstack/client';
import type { LlmStreamState } from '@loopstack/client';
import { isLlmResponseEvent } from '@loopstack/contracts/events';
import { useLoopstackClient } from '../provider.js';

/**
 * Accumulates the `llm.response.*` events of one workflow run into
 * per-message stream state (text, thinking, tool calls, completion). Purely
 * data — typewriter animations and document synthesis stay with the consumer.
 *
 * Changing `workflowId` resets the accumulated state.
 */
export function useLlmStream(workflowId: string | undefined): LlmStreamState {
  const client = useLoopstackClient();
  const [state, setState] = useState<LlmStreamState>({});

  useEffect(() => {
    setState({});
    if (!workflowId) return;

    return client.stream.onAny((message) => {
      if (!('userId' in message)) return;
      if (!isLlmResponseEvent(message)) return;
      if (message.workflowId !== workflowId) return;
      setState((previous) => reduceLlmStream(previous, message));
    });
  }, [client, workflowId]);

  return state;
}
