import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import type { RunPromptProps } from './types.ts';

interface FormAction {
  transition?: string;
  label?: string;
}

interface SchemaProperty {
  type?: string;
  readonly?: boolean;
  title?: string;
  default?: unknown;
}

/**
 * `form`: schema-driven fields initialized from the document content, submitted via one
 * of the widget's declared actions — mirroring the CLI's `collectForm` (content skeleton,
 * read-only fields locked, action picks the transition).
 */
export function FormPrompt({ view, submit, isSubmitting }: RunPromptProps) {
  const schema = view.schema as { properties?: Record<string, SchemaProperty> } | undefined;
  const properties = useMemo(() => schema?.properties ?? {}, [schema]);
  const uiProperties = (view.options?.properties ?? {}) as Record<string, { readonly?: boolean } | undefined>;
  const content = (view.content ?? {}) as Record<string, unknown>;

  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = { ...content };
    for (const [key, property] of Object.entries(properties)) {
      if (initial[key] === undefined && property.default !== undefined) initial[key] = property.default;
    }
    return initial;
  });

  const actions = ((view.options?.actions as FormAction[] | undefined) ?? []).filter(
    (action) => action.transition && view.transitions.includes(action.transition),
  );
  if (actions.length === 0) return null;

  const isReadOnly = (key: string) => (uiProperties[key]?.readonly ?? properties[key]?.readonly) === true;
  const setValue = (key: string, value: unknown) => setValues((current) => ({ ...current, [key]: value }));

  const markdown = typeof content.markdown === 'string' ? content.markdown : undefined;
  const fieldKeys = Object.keys(properties).filter((key) => key !== 'markdown');

  return (
    <div className="space-y-3">
      {markdown && <p className="text-sm whitespace-pre-wrap">{markdown}</p>}
      {fieldKeys.map((key) => {
        const property = properties[key];
        const value = values[key];
        const disabled = isSubmitting || isReadOnly(key);
        const label = property.title ?? key;
        if (property.type === 'boolean') {
          return (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                id={`form-${key}`}
                checked={value === true}
                onCheckedChange={(checked) => setValue(key, checked === true)}
                disabled={disabled}
              />
              <Label htmlFor={`form-${key}`}>{label}</Label>
            </div>
          );
        }
        if (property.type === 'number' || property.type === 'integer') {
          return (
            <div key={key} className="space-y-1">
              <Label htmlFor={`form-${key}`}>{label}</Label>
              <Input
                id={`form-${key}`}
                type="number"
                value={typeof value === 'number' ? value : ''}
                onChange={(event) => setValue(key, event.target.value === '' ? undefined : Number(event.target.value))}
                disabled={disabled}
              />
            </div>
          );
        }
        if (property.type === 'string' || value === undefined || typeof value === 'string') {
          return (
            <div key={key} className="space-y-1">
              <Label htmlFor={`form-${key}`}>{label}</Label>
              <Input
                id={`form-${key}`}
                value={typeof value === 'string' ? value : ''}
                onChange={(event) => setValue(key, event.target.value)}
                disabled={disabled}
              />
            </div>
          );
        }
        // Structured field — edited as JSON, kept honest by parse-on-submit.
        return (
          <div key={key} className="space-y-1">
            <Label htmlFor={`form-${key}`}>{label} (JSON)</Label>
            <textarea
              id={`form-${key}`}
              className="border-input w-full rounded-md border bg-transparent p-2 font-mono text-sm"
              rows={4}
              defaultValue={JSON.stringify(value, null, 2)}
              onChange={(event) => {
                try {
                  setValue(key, JSON.parse(event.target.value));
                } catch {
                  // keep last valid value until the JSON parses
                }
              }}
              disabled={disabled}
            />
          </div>
        );
      })}
      <div className="flex gap-2">
        {actions.map((action) => (
          <Button
            key={action.transition}
            onClick={() => submit(values, action.transition)}
            disabled={isSubmitting}
            variant={action === actions[0] ? 'default' : 'outline'}
          >
            {action.label ?? action.transition}
          </Button>
        ))}
      </div>
    </div>
  );
}
