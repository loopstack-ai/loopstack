import { stdin } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import type { LoopstackClient } from '@loopstack/client';
import { resolveCollectWidget } from '../widgets/registry.js';
import type { CollectContext, CollectIo, PromptAnswer } from '../widgets/types.js';
import type { ActivePrompt } from './discovery.js';

export type { PromptAnswer } from '../widgets/types.js';

export type PromptResult = PromptAnswer | undefined;

export interface PromptOptions {
  /** Aborts open questions when the prompt is resolved elsewhere. */
  signal?: AbortSignal;
}

function availableTransitionIds(prompt: ActivePrompt): string[] {
  return prompt.workflow.availableTransitions?.map((transition) => transition.id) ?? [];
}

/**
 * Pass-through writable with a mute switch — readline echoes typed input
 * through its output stream, so muting it while a secret is typed gives
 * sudo-style no-echo input without touching raw mode.
 */
class MutableEcho extends Writable {
  muted = false;

  constructor(private readonly target: NodeJS.WritableStream) {
    super();
  }

  override _write(chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    if (!this.muted) this.target.write(chunk as Buffer);
    callback();
  }
}

/**
 * Collects the user's answer for the active prompt — dispatches to the
 * widget registry's collect implementation, the terminal counterpart of
 * Studio's prompt renderers. Returns `undefined` when the user declines or
 * no collect widget exists (discovery only surfaces collectable prompts, so
 * the latter is defensive).
 */
export async function promptForAnswer(
  client: LoopstackClient,
  prompt: ActivePrompt,
  out: NodeJS.WritableStream,
  options: PromptOptions = {},
): Promise<PromptResult> {
  const collect = resolveCollectWidget(prompt.widget?.widget);
  if (!collect) return undefined;

  const echo = new MutableEcho(out);
  // terminal mode normally derives from output.isTTY — the echo wrapper is
  // not a TTY, so derive it from stdin instead. Terminal mode makes readline
  // own the echo (raw mode): keystrokes reach the terminal only through the
  // wrapper, which is what makes muting actually suppress them.
  const rl = createInterface({ input: stdin, output: echo, terminal: stdin.isTTY });
  const io: CollectIo = {
    ask: (query: string) => rl.question(query, { signal: options.signal }),
    askSecret: async (query: string) => {
      // The prompt itself must show; mute right after readline wrote it so
      // only the typed value is swallowed. The user's enter never echoes —
      // write the newline ourselves.
      const answer = rl.question(query, { signal: options.signal });
      echo.muted = true;
      try {
        return await answer;
      } finally {
        echo.muted = false;
        out.write('\n');
      }
    },
    out,
  };
  const ctx: CollectContext = {
    content: (prompt.document?.content ?? {}) as Record<string, unknown>,
    documentName: prompt.document?.documentName,
    options: prompt.widget?.options,
    schema: prompt.widget?.schema,
    availableTransitions: availableTransitionIds(prompt),
    workspaceId: prompt.workflow.workspaceId,
    http: client.http,
  };
  try {
    return await collect(ctx, io);
  } finally {
    rl.close();
  }
}

/** One-line description of the prompt for non-interactive shells. */
export function describePrompt(prompt: ActivePrompt): string {
  const content = (prompt.document?.content ?? {}) as Record<string, unknown>;
  if (typeof content.question === 'string') return content.question;
  if (typeof content.markdown === 'string') return content.markdown.split('\n')[0];
  // Workflow-level widgets carry no document — their label is the
  // human-facing description (e.g. "Send Message" for a chat input).
  const label = prompt.widget?.options?.label;
  if (typeof label === 'string' && label.trim()) return label;
  return `transitions: ${availableTransitionIds(prompt).join(', ')}`;
}
