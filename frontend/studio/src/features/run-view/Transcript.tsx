import type { DocumentItemInterface } from '@loopstack/contracts/api';
import AiMessage from '@/features/documents/renderers/AiMessage.tsx';
import DocumentDebugRenderer from '@/features/documents/renderers/DocumentDebugRenderer.tsx';
import DocumentMessageRenderer from '@/features/documents/renderers/DocumentMessageRenderer.tsx';
import ErrorMessageRenderer from '@/features/documents/renderers/ErrorMessageRenderer.tsx';
import LlmMessage from '@/features/documents/renderers/LlmMessage.tsx';
import MarkdownMessageRenderer from '@/features/documents/renderers/MarkdownMessageRenderer.tsx';
import PlainMessageRenderer from '@/features/documents/renderers/PlainMessageRenderer.tsx';
import { InertPromptEntry } from './prompts/cards.tsx';
import type { TranscriptEntry } from './transcript.ts';

/**
 * Widgets whose legacy renderers are display-only (no submit logic) and safe to reuse.
 * Interactive widgets never dispatch to legacy renderers — they carry legacy
 * submittability rules; in the transcript they render as inert entries, and the one
 * *picked* prompt renders via the run view's own prompt registry at the bottom.
 */
const displayRenderers = new Map<string, (document: DocumentItemInterface, isLastItem: boolean) => React.ReactNode>([
  ['ai-message', (document, isLastItem) => <AiMessage document={document} isLastItem={isLastItem} />],
  ['llm-message', (document, isLastItem) => <LlmMessage document={document} isLastItem={isLastItem} />],
  ['message', (document) => <DocumentMessageRenderer document={document} />],
  ['error', (document) => <ErrorMessageRenderer document={document} />],
  ['plain', (document) => <PlainMessageRenderer document={document} />],
  ['markdown', (document) => <MarkdownMessageRenderer document={document} />],
  ['debug', (document) => <DocumentDebugRenderer document={document} />],
]);

function TranscriptDocument({ entry, isLastItem }: { entry: TranscriptEntry; isLastItem: boolean }) {
  const display = entry.widget ? displayRenderers.get(entry.widget) : undefined;
  if (display) return <>{display(entry.document, isLastItem)}</>;
  if (entry.widget) return <InertPromptEntry document={entry.document} />;
  // No widget config — JSON fallback, the CLI's honest default for unknown documents.
  return (
    <pre className="bg-muted/50 overflow-x-auto rounded-md p-3 font-mono text-xs">
      {JSON.stringify(entry.document.content, null, 2)}
    </pre>
  );
}

/** The chronological, depth-indented document trail — the CLI transcript, rendered. */
export function Transcript({ entries }: { entries: TranscriptEntry[] }) {
  return (
    <div className="space-y-3">
      {entries.map((entry, index) => (
        <div
          key={entry.document.id}
          style={entry.depth > 0 ? { marginLeft: entry.depth * 20 } : undefined}
          className={entry.depth > 0 ? 'border-muted border-l-2 pl-3' : undefined}
        >
          <TranscriptDocument entry={entry} isLastItem={index === entries.length - 1} />
        </div>
      ))}
    </div>
  );
}
