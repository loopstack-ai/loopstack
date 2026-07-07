import pc from 'picocolors';
import type { LoopstackClient } from '@loopstack/client';
import { SortOrder } from '@loopstack/contracts/enums';
import { fetchDocumentWidgets } from '../hitl/discovery.js';
import type { WidgetConfig } from '../hitl/discovery.js';

/**
 * Widgets the live renderer must not print: prompts belong to the HITL
 * renderer, llm-message content already streamed as tokens, links are
 * Studio navigation.
 */
const SKIP_WIDGETS = new Set(['text-prompt', 'confirm-prompt', 'choices', 'form', 'llm-message', 'link']);

/**
 * Renders the text-bearing documents a run saves (e.g. `MessageDocument`)
 * as they appear on the event stream — the terminal counterpart of Studio's
 * message widgets. Documents are fetched on `document.created` (the event
 * carries no content) and deduplicated across calls.
 */
export function createDocumentRenderer(
  client: LoopstackClient,
  out: NodeJS.WritableStream,
): (workflowId: string) => Promise<void> {
  let widgetsPromise: Promise<Map<string, WidgetConfig>> | undefined;
  const seen = new Set<string>();

  return async (workflowId: string): Promise<void> => {
    widgetsPromise ??= fetchDocumentWidgets(client);
    const widgets = await widgetsPromise.catch(() => new Map<string, WidgetConfig>());
    const page = await client.documents
      .list({
        filter: { workflowId },
        sortBy: [{ field: 'index', order: SortOrder.ASC }],
        limit: 50,
      })
      .catch(() => undefined);
    if (!page) return;

    for (const document of page.data) {
      if (seen.has(document.id)) continue;
      seen.add(document.id);

      const widget = widgets.get(document.documentName)?.widget;
      if (widget && SKIP_WIDGETS.has(widget)) continue;

      const content = (document.content ?? {}) as Record<string, unknown>;
      const text =
        typeof content.text === 'string'
          ? content.text
          : typeof content.markdown === 'string'
            ? content.markdown
            : undefined;
      if (!text?.trim()) continue;

      const role = typeof content.role === 'string' && content.role !== 'assistant' ? pc.dim(`${content.role}: `) : '';
      out.write(`${role}${text}\n`);
    }
  };
}
