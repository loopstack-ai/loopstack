import type { DocumentItemInterface } from '@loopstack/contracts/api';

export interface TranscriptSource {
  workflowId: string;
  depth: number;
  documents: DocumentItemInterface[];
}

export interface TranscriptEntry {
  document: DocumentItemInterface;
  depth: number;
  /** Resolved widget name; undefined when the document has no config (JSON fallback). */
  widget?: string;
}

/**
 * Composes the transcript exactly as the CLI does (`renderDocumentHistory` +
 * `createDocumentRenderer`): all documents of every node merged chronologically
 * (`createdAt`, then `index`); sub-workflow output visible only once a `link` document
 * revealed the child (`show: 'hidden'` children never get one, so they stay suppressed);
 * `link` documents themselves are visibility bookkeeping, not transcript entries.
 */
export function composeTranscript(
  sources: TranscriptSource[],
  resolveWidget: (documentName: string) => string | undefined,
): TranscriptEntry[] {
  const all = sources.flatMap((source) => source.documents.map((document) => ({ document, depth: source.depth })));
  all.sort(
    (a, b) =>
      new Date(a.document.createdAt).getTime() - new Date(b.document.createdAt).getTime() ||
      a.document.index - b.document.index,
  );

  const visible = new Set(sources.filter((source) => source.depth === 0).map((source) => source.workflowId));
  const entries: TranscriptEntry[] = [];
  for (const { document, depth } of all) {
    if (depth > 0 && !visible.has(document.workflowId)) continue;
    const widget = resolveWidget(document.documentName);
    if (widget === 'link') {
      const target = (document.content as { workflowId?: unknown } | null)?.workflowId;
      if (typeof target === 'string') visible.add(target);
      continue;
    }
    entries.push({ document, depth, widget });
  }
  return entries;
}
