import { Info, KeyRound, Loader2 } from 'lucide-react';
import React, { useState } from 'react';
import type { WorkflowFullInterface } from '@loopstack/contracts/api';
import type { DocumentItemInterface, TransitionPayloadInterface } from '@loopstack/contracts/types';
import CompletionMessagePaper from '@/components/messages/CompletionMessagePaper.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { useWorkbenchLayout } from '@/features/workbench';
import { useRunWorkflow } from '@/hooks/useProcessor.ts';
import { useUpsertSecret } from '@/hooks/useSecrets.ts';

interface SecretVariable {
  key: string;
  value?: string;
}

interface SecretInputContent {
  variables?: SecretVariable[];
}

interface SecretInputRendererProps {
  parentWorkflow: WorkflowFullInterface;
  workflow: WorkflowFullInterface;
  document: DocumentItemInterface;
  isActive: boolean;
}

const SecretInputRenderer: React.FC<SecretInputRendererProps> = ({ parentWorkflow, workflow, document, isActive }) => {
  const content = document.content as SecretInputContent;
  const variables = content.variables ?? [];

  // Resolve transition from ui.widgets[0].options.transition
  const widgets = (document.ui as Record<string, unknown> | undefined)?.widgets as
    | { options?: { transition?: string; label?: string } }[]
    | undefined;
  const widgetOptions = widgets?.[0]?.options;
  const transitionId = widgetOptions?.transition;
  const buttonLabel = widgetOptions?.label ?? 'Save & Continue';

  const { workflow: workbenchWorkflow } = useWorkbenchLayout();
  const workspaceId = workbenchWorkflow?.workspaceId;
  const runWorkflow = useRunWorkflow();
  const upsertSecret = useUpsertSecret();
  const availableTransitions = workflow.availableTransitions?.map((t) => t.id) ?? [];

  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const v of variables) {
      initial[v.key] = v.value ?? '';
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);

  const canSubmit = !!transitionId && availableTransitions.includes(transitionId);
  const disabled = !isActive || !canSubmit;

  const handleSave = async () => {
    if (!workspaceId || !transitionId) return;
    setSaving(true);

    try {
      const savedKeys: string[] = [];

      for (const variable of variables) {
        const value = values[variable.key]?.trim();
        if (!variable.key.trim() || !value) continue;

        await upsertSecret.mutateAsync({
          workspaceId,
          key: variable.key,
          value,
        });

        savedKeys.push(variable.key);
      }

      runWorkflow.mutate({
        workflowId: parentWorkflow.id,
        runWorkflowPayloadDto: {
          transition: {
            id: transitionId,
            workflowId: workflow.id,
            payload: { keys: savedKeys },
          } as TransitionPayloadInterface,
        },
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <CompletionMessagePaper role="document" fullWidth={true} timestamp={new Date(document.createdAt)}>
      <div className="flex flex-col gap-4 p-1">
        <div className="text-sm font-medium">Secrets</div>

        {variables.map((variable) => (
          <div key={variable.key} className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground text-xs">{variable.key}</Label>
            <Input
              type="password"
              placeholder="Enter value..."
              value={values[variable.key] ?? ''}
              onChange={(e) => setValues((prev) => ({ ...prev, [variable.key]: e.target.value }))}
              disabled={disabled}
            />
          </div>
        ))}

        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span>To add or remove other secrets, use the Secrets panel in the right sidebar.</span>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => void handleSave()} disabled={disabled || saving} className="w-48">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
            {buttonLabel}
          </Button>
        </div>
      </div>
    </CompletionMessagePaper>
  );
};

export default SecretInputRenderer;
