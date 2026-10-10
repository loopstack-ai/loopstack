import { Info, KeyRound, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { useUpsertSecret } from '@/hooks/useSecrets.ts';
import type { RunPromptProps } from './types.ts';

interface SecretVariable {
  key: string;
  value?: string;
}

/**
 * `secret-input`: workspace-secret request — upserts each filled value via the secrets
 * API first, then fires the transition with the saved keys (the legacy renderer's flow;
 * the values themselves never enter the workflow payload).
 */
export function SecretPrompt({ view, submit, isSubmitting, workspaceId }: RunPromptProps) {
  const variables = ((view.content as { variables?: SecretVariable[] } | undefined)?.variables ?? []).filter(
    (variable) => variable.key?.trim(),
  );
  const upsertSecret = useUpsertSecret();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(variables.map((variable) => [variable.key, variable.value ?? ''])),
  );
  const [saving, setSaving] = useState(false);
  const buttonLabel = typeof view.options?.label === 'string' ? view.options.label : 'Save & Continue';

  if (variables.length === 0 || !workspaceId) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const savedKeys: string[] = [];
      for (const variable of variables) {
        const value = values[variable.key]?.trim();
        if (!value) continue;
        await upsertSecret.mutateAsync({ workspaceId, key: variable.key, value });
        savedKeys.push(variable.key);
      }
      submit({ keys: savedKeys });
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || isSubmitting;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Secrets</p>
      {variables.map((variable) => (
        <div key={variable.key} className="space-y-1">
          <Label className="text-muted-foreground text-xs" htmlFor={`secret-${variable.key}`}>
            {variable.key}
          </Label>
          <Input
            id={`secret-${variable.key}`}
            type="password"
            placeholder="Enter value..."
            value={values[variable.key] ?? ''}
            onChange={(event) => setValues((prev) => ({ ...prev, [variable.key]: event.target.value }))}
            disabled={busy}
          />
        </div>
      ))}
      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span>Values are stored as workspace secrets — only the saved keys reach the workflow.</span>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => void handleSave()} disabled={busy} className="w-48">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}
