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
 * The revisions of one entry, and where that entry belongs in the transcript.
 *
 * A keyed save does not update a row: it writes a new document, marks the one it supersedes as invalidated,
 * and gives the new one the superseded one's `index`. So the documents of a workflow that share an `index`
 * are the versions of a single entry, and exactly one of them is live.
 */
interface Revisions {
  document: DocumentItemInterface;
  depth: number;
  /** When the entry first appeared — **not** when it was last written. See {@link composeTranscript}. */
  appearedAt: number;
}

/**
 * Composes the transcript from the run tree: one entry per document, merged chronologically (`createdAt`,
 * then `index`); sub-workflow output visible only once a `link` document revealed the child (`show:
 * 'hidden'` children never get one, so they stay suppressed); `link` documents themselves are visibility
 * bookkeeping, not transcript entries.
 *
 * **A re-saved document is one entry, not several.** The window is the `all` scope because the live delta
 * has to see invalidated rows to learn that something was superseded — so what arrives here is every
 * revision, and only the live one is drawn. Drawing them all is what turned a streaming terminal into one
 * card per poll, and a re-presented gate into a stack of cards whose buttons all looked live.
 *
 * **An entry keeps the position it first appeared at.** A revision carries a newer `createdAt`, so sorting
 * on the live row's timestamp would walk a card that is still being written to the bottom of the transcript
 * on every update, past everything written while it ran.
 */
export function composeTranscript(
  sources: TranscriptSource[],
  resolveWidget: (documentName: string) => string | undefined,
): TranscriptEntry[] {
  const entriesByKey = new Map<string, Revisions>();
  for (const source of sources) {
    for (const document of source.documents) {
      const key = `${source.workflowId}\u0000${document.index}`;
      const appearedAt = new Date(document.createdAt).getTime();
      const seen = entriesByKey.get(key);
      if (!seen) {
        entriesByKey.set(key, { document, depth: source.depth, appearedAt });
        continue;
      }
      seen.appearedAt = Math.min(seen.appearedAt, appearedAt);
      // The live row wins. Where every revision is invalidated — a run torn down mid-write — the newest of
      // them is still the closest thing to the truth.
      const better =
        (!document.isInvalidated && seen.document.isInvalidated) ||
        (document.isInvalidated === seen.document.isInvalidated &&
          appearedAt > new Date(seen.document.createdAt).getTime());
      if (better) seen.document = document;
    }
  }

  const all = [...entriesByKey.values()];
  all.sort((a, b) => a.appearedAt - b.appearedAt || a.document.index - b.document.index);

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
