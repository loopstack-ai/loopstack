import { AlertCircle, RefreshCw } from 'lucide-react';
import type { ParkView } from '@loopstack/contracts/park-view';
import { Button } from '@/components/ui/button.tsx';

/** A picked prompt the run view has no component for — inert, no handoff. */
export function NotSupportedCard({ view }: { view: ParkView }) {
  return (
    <div className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
      Input of type <code className="font-mono">{view.widget}</code> is not yet supported in the run view.
    </div>
  );
}

/** The tree is parked but nothing is renderable — diagnostic signal, not an error. */
export function BareWaitCard({ view }: { view: ParkView }) {
  return (
    <div className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
      Waiting on <code className="font-mono">{view.transitions.join(', ') || '—'}</code> — nothing to show.
    </div>
  );
}

/**
 * A failed workflow without an answerable recovery prompt — the CLI's `offerRetry`
 * fallback branch: recovery prompts take precedence via the canonical rules; plain
 * re-run is what remains.
 */
export function FailedRunCard({
  workflowName,
  errorMessage,
  onRetry,
  isRetrying,
}: {
  workflowName: string;
  errorMessage?: string | null;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  return (
    <div className="border-destructive/40 space-y-2 rounded-md border p-3">
      <p className="flex items-center gap-2 text-sm">
        <AlertCircle className="text-destructive h-4 w-4 shrink-0" />
        <span>
          <span className="font-medium">{workflowName}</span> failed{errorMessage ? `: ${errorMessage}` : '.'}
        </span>
      </p>
      <Button variant="outline" size="sm" onClick={onRetry} disabled={isRetrying}>
        <RefreshCw className="mr-2 h-3.5 w-3.5" />
        Retry
      </Button>
    </div>
  );
}

/** An interactive prompt rendered as inert transcript history (answered or inactive). */
export function InertPromptEntry({ document }: { document: { content: unknown } }) {
  const content = (document.content ?? {}) as { question?: unknown; answer?: unknown; markdown?: unknown };
  const question =
    typeof content.question === 'string'
      ? content.question
      : typeof content.markdown === 'string'
        ? content.markdown
        : undefined;
  const answered = content.answer !== undefined;
  return (
    <div className="rounded-md border p-3 text-sm">
      {question && <p className="font-medium">{question}</p>}
      {answered && <p className="text-muted-foreground mt-1">Answered: {formatAnswer(content.answer)}</p>}
    </div>
  );
}

function formatAnswer(answer: unknown): string {
  if (typeof answer === 'string') return answer;
  if (typeof answer === 'boolean') return answer ? 'yes' : 'no';
  return JSON.stringify(answer);
}
