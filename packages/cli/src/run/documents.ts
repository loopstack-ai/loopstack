import pc from 'picocolors';
import type { LoopstackClient } from '@loopstack/client';
import type { DocumentItemInterface } from '@loopstack/contracts/api';
import { SortOrder } from '@loopstack/contracts/enums';
import { fetchDocumentWidgets } from '../hitl/discovery.js';
import type { WidgetConfig } from '../hitl/discovery.js';
import { resolveDocumentWidget } from '../widgets/registry.js';
import type { WidgetContext, WidgetOutput } from '../widgets/types.js';

export interface DocumentRendererOptions {
  /**
   * Builds a Studio deep link for a workflow id — used by `link` documents
   * and actionable forms. Without it the workflow id is printed.
   */
  studioUrl?: (workflowId: string) => string | undefined;
  /**
   * Ids of messages whose tokens already streamed live (collected by
   * `followRun`). An llm-message document with a matching id skips its text
   * — it is on screen. Everything else prints, including repeated content:
   * a re-saved message is honest output, not a duplicate to hide.
   */
  streamedMessageIds?: ReadonlySet<string>;
  /** Ids of tool calls already rendered live from stream events. */
  streamedToolCallIds?: ReadonlySet<string>;
  /**
   * Sub-workflows visible in the transcript — populated by this renderer
   * whenever a `link` document names a child (`show: 'inline' | 'link'`).
   * `show: 'hidden'` children never get a link document, so their output is
   * suppressed, exactly like in Studio. Omit the set to render everything.
   */
  visibleWorkflowIds?: Set<string>;
}

export interface DocumentRenderer {
  /** Event-driven entry: renders the not-yet-seen documents of one workflow. */
  onDocument: (workflowId: string, depth?: number) => Promise<void>;
  /** Renders one already-fetched document; documents render at most once. */
  renderDocument: (document: DocumentItemInterface, depth: number) => Promise<void>;
}

/**
 * Renders the documents a run saves — the terminal counterpart of Studio's
 * document renderers. Content rendering is dispatched to the widget
 * registry; this layer owns transcript composition: fetching, dedupe,
 * paragraph spacing, and the `│ ` gutter rail per sub-workflow nesting level.
 */
export function createDocumentRenderer(
  client: LoopstackClient,
  out: NodeJS.WritableStream,
  options: DocumentRendererOptions = {},
): DocumentRenderer {
  let widgetsPromise: Promise<Map<string, WidgetConfig>> | undefined;
  const seen = new Set<string>();

  const renderDocument = async (document: DocumentItemInterface, depth: number): Promise<void> => {
    if (seen.has(document.id)) return;

    // Studio parity: sub-workflow output renders only once a link document
    // made the child visible. Not marked seen — a late link still reveals it.
    if (depth > 0 && options.visibleWorkflowIds && !options.visibleWorkflowIds.has(document.workflowId)) {
      return;
    }
    seen.add(document.id);

    widgetsPromise ??= fetchDocumentWidgets(client);
    const widgets = await widgetsPromise.catch(() => new Map<string, WidgetConfig>());
    const config = widgets.get(document.documentName);
    const widget = resolveDocumentWidget(config?.widget);
    if (!widget) return;

    if (config?.widget === 'link') {
      const target = (document.content as { workflowId?: unknown } | null)?.workflowId;
      if (typeof target === 'string') options.visibleWorkflowIds?.add(target);
    }

    const ctx: WidgetContext = {
      documentName: document.documentName,
      workflowId: document.workflowId,
      options: config?.options,
      schema: config?.schema,
      streamedMessageIds: options.streamedMessageIds,
      streamedToolCallIds: options.streamedToolCallIds,
      studioUrl: options.studioUrl,
    };
    const output: WidgetOutput = {
      block: (text) => {
        out.write('\n');
        writeLine(out, depth, text);
      },
      line: (text) => writeLine(out, depth, text),
    };
    widget((document.content ?? {}) as Record<string, unknown>, ctx, output);
  };

  const onDocument = async (workflowId: string, depth = 0): Promise<void> => {
    const page = await client.documents
      .list({
        filter: { workflowId },
        sortBy: [{ field: 'index', order: SortOrder.ASC }],
        limit: 50,
      })
      .catch(() => undefined);
    for (const document of page?.data ?? []) {
      await renderDocument(document, depth);
    }
  };

  return { onDocument, renderDocument };
}

const HISTORY_PAGE_SIZE = 100;

/**
 * Renders the full document history of a run tree chronologically — the
 * static-trail counterpart of the live event stream. Everything rendered
 * here is marked seen, so a live follow attached afterwards continues
 * without repeats.
 */
export async function renderDocumentHistory(
  client: LoopstackClient,
  renderer: DocumentRenderer,
  rootWorkflowId: string,
): Promise<void> {
  // Breadth-first over the run tree, remembering each workflow's depth.
  const depths = new Map<string, number>([[rootWorkflowId, 0]]);
  const queue = [rootWorkflowId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const children = await client.workflows.list({ filter: { parentId: id } }).catch(() => undefined);
    for (const child of children?.data ?? []) {
      if (depths.has(child.id)) continue;
      depths.set(child.id, (depths.get(id) ?? 0) + 1);
      queue.push(child.id);
    }
  }

  const documents: { document: DocumentItemInterface; depth: number }[] = [];
  for (const [workflowId, depth] of depths) {
    for (let page = 0; ; page++) {
      const result = await client.documents
        .list({
          filter: { workflowId },
          sortBy: [{ field: 'index', order: SortOrder.ASC }],
          page,
          limit: HISTORY_PAGE_SIZE,
        })
        .catch(() => undefined);
      if (!result) break;
      documents.push(...result.data.map((document) => ({ document, depth })));
      if (result.data.length < HISTORY_PAGE_SIZE) break;
    }
  }

  documents.sort(
    (a, b) =>
      new Date(a.document.createdAt).getTime() - new Date(b.document.createdAt).getTime() ||
      a.document.index - b.document.index,
  );

  for (const { document, depth } of documents) {
    await renderer.renderDocument(document, depth);
  }
}

/** Writes a (possibly multi-line) block, each line behind the depth's `│ ` rail. */
function writeLine(out: NodeJS.WritableStream, depth: number, block: string): void {
  const rail = depth > 0 ? pc.dim('│ '.repeat(depth)) : '';
  out.write(`${rail}${block.split('\n').join(`\n${rail}`)}\n`);
}
