import type { ParkView } from '@loopstack/contracts/park-view';

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
