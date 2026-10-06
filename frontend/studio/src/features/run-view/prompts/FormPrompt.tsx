import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { JSONSchemaConfigType, UiFormType } from '@loopstack/contracts/types';
import Form from '@/components/dynamic-form/Form.tsx';
import { describeFormErrors } from '@/components/dynamic-form/form-errors.ts';
import { Button } from '@/components/ui/button.tsx';
import { buttonVariant } from './button-variant.ts';
import type { RunPromptProps } from './types.ts';

interface FormAction {
  transition?: string;
  label?: string;
  variant?: string;
}

interface SchemaProperty {
  default?: unknown;
}

/**
 * `form`: the document's fields, drawn as the document declared them, submitted through one of the widget's
 * actions.
 *
 * The fields come from `components/dynamic-form/Form`, the same renderer the document tree uses — so a
 * textarea has its rows, an enum is a select, a collapsed block is collapsed, and a widget added there works
 * here without a second registry. What this component owns is what the run view needs to own: the values
 * seeded from the document content, the actions filtered to the transitions the run offers, and the submit.
 *
 * A `markdown` field with no declared widget is the form's heading. The CLI prints it that way, and every
 * surface should read the same document the same way.
 */
export function FormPrompt({ view, submit, isSubmitting }: RunPromptProps) {
  const schema = (view.schema ?? {}) as { properties?: Record<string, SchemaProperty> };
  const content = (view.content ?? {}) as Record<string, unknown>;
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Read once: `useForm` takes its defaults on the first render only, as the legacy renderer does.
  const [defaultValues] = useState(() => {
    const initial: Record<string, unknown> = { ...content };
    for (const [key, property] of Object.entries(schema.properties ?? {})) {
      if (initial[key] === undefined && property.default !== undefined) initial[key] = property.default;
    }
    return initial;
  });
  const form = useForm<Record<string, unknown>>({ defaultValues, mode: 'onChange' });

  const ui = useMemo(() => {
    const declared = (view.options?.properties ?? {}) as Record<string, Record<string, unknown> | undefined>;
    const properties = { ...declared };
    if ('markdown' in (schema.properties ?? {}) && !declared.markdown?.widget) {
      properties.markdown = { ...declared.markdown, widget: 'markdown-view' };
    }
    return { form: { properties, order: view.options?.order } } as UiFormType;
  }, [view.options, schema.properties]);

  const actions = ((view.options?.actions as FormAction[] | undefined) ?? []).filter(
    (action) => action.transition && view.transitions.includes(action.transition),
  );
  if (actions.length === 0) return null;

  const act = (transition: string) =>
    void form.handleSubmit(
      (values) => {
        setSubmitError(null);
        submit(values, transition);
      },
      (errors) => setSubmitError(describeFormErrors(errors)),
    )();

  return (
    <Form
      form={form}
      schema={schema as JSONSchemaConfigType}
      ui={ui}
      disabled={isSubmitting}
      viewOnly={false}
      actions={
        <div className="flex w-full flex-col items-end gap-2">
          {submitError && (
            <p className="text-destructive w-full text-right text-sm" role="alert">
              {submitError}
            </p>
          )}
          <div className="flex gap-2">
            {actions.map((action) => (
              <Button
                key={action.transition}
                type="button"
                variant={buttonVariant(action.variant) ?? 'default'}
                onClick={() => act(action.transition!)}
                disabled={isSubmitting}
              >
                {action.label ?? action.transition}
              </Button>
            ))}
          </div>
        </div>
      }
    />
  );
}
