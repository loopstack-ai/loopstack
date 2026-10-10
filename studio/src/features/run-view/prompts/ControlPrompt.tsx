import type { ParkView } from '@loopstack/contracts/park-view';
import { usePendingTransition } from '@/hooks/usePendingTransition.ts';
import { useRunWorkflow } from '@/hooks/useProcessor.ts';
import { promptRegistry } from './registry.tsx';

/**
 * A workflow-level widget drawn beside the picked prompt, with its own submit.
 *
 * It answers its own workflow, which need not be the one the picked prompt belongs to: a reply input on the
 * engineer loop sits under a question card raised by a sub-workflow. Pending state is per control, so one
 * click does not grey out the card next to it.
 */
export function ControlPrompt({ view, workspaceId }: { view: ParkView; workspaceId?: string }) {
  const runWorkflow = useRunWorkflow();
  const { isPending, markSubmitted, cancel } = usePendingTransition(view.transitions);
  const Component = view.widget ? promptRegistry.get(view.widget) : undefined;
  if (!Component) return null;

  const submit = (payload: unknown, transitionId?: string) => {
    const id = transitionId ?? view.defaultTransition;
    if (!id) return;
    markSubmitted(id);
    runWorkflow.mutate(
      { workflowId: view.workflowId, payload: { transition: { id, workflowId: view.workflowId, payload } } },
      { onError: () => cancel() },
    );
  };

  return (
    <div className="bg-background rounded-lg border p-4 shadow-sm">
      <Component
        view={view}
        submit={submit}
        isSubmitting={runWorkflow.isPending || isPending}
        workspaceId={workspaceId}
      />
    </div>
  );
}
