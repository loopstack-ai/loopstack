import { Info, KeyRound, Loader2 } from 'lucide-react';
import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useWorkbenchLayout } from '@/features/workbench';
import { useUpsertSecret } from '@/hooks/useSecrets';
import { Button } from '../../ui/button';

interface SecretInputProps {
  ui?: { transition?: string; label?: string };
  disabled: boolean;
  onSubmit: (data?: Record<string, unknown> | string) => void;
}

interface SecretVariable {
  key: string;
  value?: string;
}

export const SecretInput: React.FC<SecretInputProps> = ({ ui, disabled, onSubmit }) => {
  const { pipeline } = useWorkbenchLayout();
  const workspaceId = pipeline?.workspaceId;
  const form = useFormContext();
  const upsertSecret = useUpsertSecret();

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!workspaceId) return;
    setSaving(true);

    try {
      const formValues = form.getValues();
      const variables = (formValues.variables ?? []) as SecretVariable[];
      const savedKeys: string[] = [];

      for (const variable of variables) {
        if (!variable.key?.trim() || !variable.value?.trim()) continue;

        await upsertSecret.mutateAsync({
          workspaceId,
          key: variable.key,
          value: variable.value,
        });

        savedKeys.push(variable.key);
      }

      onSubmit({ keys: savedKeys });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span>To add or remove other secrets, use the Secrets panel in the right sidebar.</span>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => void handleSave()} disabled={disabled || saving} className="w-48">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
          {ui?.label ?? 'Save & Continue'}
        </Button>
      </div>
    </div>
  );
};
