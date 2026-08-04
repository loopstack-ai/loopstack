import { useMemo } from 'react';
import { useRunWorkflow } from '@loopstack/react';
import { useDocumentConfigs } from '@/hooks/useConfig.ts';
import { Transcript } from './Transcript.tsx';
import { BareWaitCard, NotSupportedCard } from './prompts/cards.tsx';
import { promptRegistry } from './prompts/registry.tsx';
import { composeTranscript } from './transcript.ts';
import { useRunPrompts } from './useRunPrompts.ts';
import { useRunTree } from './useRunTree.ts';

/** Extract the primary widget name from a document's UI config (no `form` default — honesty over legacy quirk). */
function resolveWidgetName(ui: unknown): string | undefined {
  const typed = ui as { widgets?: { widget?: string }[]; form?: { widget?: string } } | undefined;
  return typed?.widgets?.[0]?.widget ?? typed?.form?.widget;
}

/**
 * A run rendered the way the CLI follows it — chronological transcript over the whole
 * tree, the one canonical prompt pinned at the bottom. Runs entirely on the shared
 * park-view rules. Pure content component: hosts (the workbench's workflow area, the
 * standalone `/runs/:id` page) own the surrounding chrome.
 */
export function RunView({ workflowId }: { workflowId: string | undefined }) {
  const { nodes, isLoading } = useRunTree(workflowId);
  const prompts = useRunPrompts(nodes);
  const documentConfigs = useDocumentConfigs();
  const runWorkflow = useRunWorkflow();

  const entries = useMemo(
    () =>
      composeTranscript(
        nodes.map((node) => ({ workflowId: node.workflowId, depth: node.depth, documents: node.documents })),
        (documentName) => resolveWidgetName(documentConfigs.get(documentName)?.ui),
      ),
    [nodes, documentConfigs],
  );

  const picked = prompts.picked;
  const PromptComponent = picked?.view.widget ? promptRegistry.get(picked.view.widget) : undefined;

  const submit = (payload: unknown, transitionId?: string) => {
    if (!picked) return;
    const id = transitionId ?? picked.view.defaultTransition;
    if (!id) return;
    // The CLI's submit call: the transition is applied to the prompting workflow itself;
    // sub-workflow completions propagate to the root via the parent's callback.
    runWorkflow.mutate({
      workflowId: picked.view.workflowId,
      payload: { transition: { id, workflowId: picked.view.workflowId, payload } },
    });
  };

  return (
    <div className="w-full max-w-3xl">
      {isLoading && <p className="text-muted-foreground text-sm">Loading run…</p>}
      <Transcript entries={entries} />

      <div className="mt-6">
        {picked && PromptComponent && (
          <div className="bg-background rounded-lg border p-4 shadow-sm">
            <PromptComponent view={picked.view} submit={submit} isSubmitting={runWorkflow.isPending} />
          </div>
        )}
        {!picked && prompts.blocked && <NotSupportedCard view={prompts.blocked.view} />}
        {!picked && !prompts.blocked && prompts.fallback && <BareWaitCard view={prompts.fallback.view} />}
      </div>
    </div>
  );
}
