import { useMemo } from 'react';
import type { DocumentItemInterface, WorkflowFullInterface } from '@loopstack/contracts/api';
import type { DocumentRendererProps } from '@/features/documents/DocumentRenderer.tsx';
import AiMessage from '@/features/documents/renderers/AiMessage.tsx';
import DocumentDebugRenderer from '@/features/documents/renderers/DocumentDebugRenderer.tsx';
import DocumentFormRenderer from '@/features/documents/renderers/DocumentFormRenderer.tsx';
import DocumentMessageRenderer from '@/features/documents/renderers/DocumentMessageRenderer.tsx';
import ErrorMessageRenderer from '@/features/documents/renderers/ErrorMessageRenderer.tsx';
import LlmMessage from '@/features/documents/renderers/LlmMessage.tsx';
import MarkdownMessageRenderer from '@/features/documents/renderers/MarkdownMessageRenderer.tsx';
import PlainMessageRenderer from '@/features/documents/renderers/PlainMessageRenderer.tsx';
import { useFeatureRegistry } from '@/features/feature-registry';
import { InertPromptEntry } from './prompts/cards.tsx';
import type { TranscriptEntry } from './transcript-model.ts';

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

function TranscriptDocument({
  entry,
  isLastItem,
  featureRenderers,
  workflows,
  rootWorkflow,
}: {
  entry: TranscriptEntry;
  isLastItem: boolean;
  featureRenderers: Map<string, React.ComponentType<DocumentRendererProps>>;
  workflows: Map<string, WorkflowFullInterface>;
  rootWorkflow?: WorkflowFullInterface;
}) {
  const display = entry.widget ? displayRenderers.get(entry.widget) : undefined;
  if (display) return <>{display(entry.document, isLastItem)}</>;

  const workflow = workflows.get(entry.document.workflowId);

  // Past form submissions render as the read-only field-by-field form — the legacy
  // renderer in viewOnly mode carries no submit UI.
  if (entry.widget === 'form' && workflow) {
    return (
      <div className="rounded-md border p-3">
        <DocumentFormRenderer
          parentWorkflow={rootWorkflow ?? workflow}
          workflow={workflow}
          document={entry.document as unknown as DocumentRendererProps['document']}
          enabled={false}
          viewOnly={true}
        />
      </div>
    );
  }

  // Feature-registered renderers (e.g. secret-input) render as inert history:
  // isActive={false} disables their submit paths; the one *picked* prompt stays
  // run-view-native at the bottom.
  const FeatureRenderer = entry.widget ? featureRenderers.get(entry.widget) : undefined;
  if (FeatureRenderer && workflow) {
    return (
      <FeatureRenderer
        parentWorkflow={rootWorkflow ?? workflow}
        workflow={workflow}
        document={entry.document as unknown as DocumentRendererProps['document']}
        isActive={false}
        isLastItem={isLastItem}
      />
    );
  }

  if (entry.widget) return <InertPromptEntry document={entry.document} />;
  // No widget config — JSON fallback, the CLI's honest default for unknown documents.
  return (
    <pre className="bg-muted/50 overflow-x-auto rounded-md p-3 font-mono text-xs">
      {JSON.stringify(entry.document.content, null, 2)}
    </pre>
  );
}

/** Classic debug-mode parity: the per-document metadata line. */
function DebugMeta({ entry }: { entry: TranscriptEntry }) {
  const parts = [
    entry.document.documentName,
    entry.widget ?? 'no widget',
    `place: ${entry.document.place ?? '—'}`,
    `index: ${entry.document.index}`,
  ];
  if (entry.document.isInvalidated) parts.push('invalidated');
  return <p className="text-muted-foreground font-mono text-[10px]">{parts.join(' · ')}</p>;
}

/** The chronological, depth-indented document trail — the CLI transcript, rendered. */
export function Transcript({
  entries,
  workflows,
  rootWorkflow,
  debug,
}: {
  entries: TranscriptEntry[];
  workflows: Map<string, WorkflowFullInterface>;
  rootWorkflow?: WorkflowFullInterface;
  debug?: boolean;
}) {
  const features = useFeatureRegistry();
  const featureRenderers = useMemo(() => {
    const map = new Map<string, React.ComponentType<DocumentRendererProps>>();
    for (const feature of features) {
      for (const [widget, renderer] of Object.entries(feature.documentRenderers ?? {})) {
        map.set(widget, renderer);
      }
    }
    return map;
  }, [features]);

  return (
    <div className="space-y-3">
      {entries.map((entry, index) => (
        <div
          key={entry.document.id}
          style={entry.depth > 0 ? { marginLeft: entry.depth * 20 } : undefined}
          className={entry.depth > 0 ? 'border-muted border-l-2 pl-3' : undefined}
        >
          {debug && <DebugMeta entry={entry} />}
          <TranscriptDocument
            entry={entry}
            isLastItem={index === entries.length - 1}
            featureRenderers={featureRenderers}
            workflows={workflows}
            rootWorkflow={rootWorkflow}
          />
        </div>
      ))}
    </div>
  );
}
