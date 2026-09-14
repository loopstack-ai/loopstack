import { SquareTerminal } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useWorkflow } from '@loopstack/react';
import DocumentRenderer from '@/features/documents/DocumentRenderer';
import { useWorkbenchLayout } from '@/features/workbench';
import { SidebarPanel } from '@/features/workbench/components/SidebarPanel';
import { useFilterDocuments } from '@/hooks/useDocuments';

/** Documents tagged with this appear in the panel. Matches the backend `HANDOFF_TAG`. */
const HANDOFF_TAG = 'handoff';

/**
 * The "Handoff" sidebar panel: shows the `handoff`-tagged documents the current run has emitted — prepared
 * commands to continue the run locally (open the checkout in an IDE, resume the session in a terminal, …) —
 * rendered via the shared document renderer and updated live via SSE. Empty until a workflow emits one.
 */
export function HandoffPanel() {
  const { panelSize, setPanelSize, closePanel } = useWorkbenchLayout();
  const { workflowId } = useParams();
  const { data: workflow } = useWorkflow(workflowId);
  const { data: documents } = useFilterDocuments(workflowId);

  const handoffDocs = (documents ?? []).filter((doc) => doc.tags?.includes(HANDOFF_TAG));

  return (
    <SidebarPanel
      icon={<SquareTerminal className="h-4 w-4" />}
      title="Handoff"
      description="Prepared commands to continue this run locally."
      size={panelSize}
      onSizeChange={setPanelSize}
      onClose={closePanel}
    >
      <div className="flex h-full flex-col gap-3 overflow-y-auto px-4 py-3">
        {!workflowId && <p className="text-muted-foreground text-sm">Open a run to see its hand-off commands.</p>}
        {workflowId && handoffDocs.length === 0 && (
          <p className="text-muted-foreground text-sm">No hand-off commands for this run yet.</p>
        )}
        {workflow &&
          handoffDocs.map((doc) => (
            <DocumentRenderer
              key={doc.id}
              parentWorkflow={workflow}
              workflow={workflow}
              document={doc}
              isActive={false}
              isLastItem={false}
            />
          ))}
      </div>
    </SidebarPanel>
  );
}
