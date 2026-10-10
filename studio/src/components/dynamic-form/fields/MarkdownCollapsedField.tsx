import { ChevronRight } from 'lucide-react';
import React, { useState } from 'react';
import { Controller } from 'react-hook-form';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';
import MarkdownContent from '../MarkdownContent';
import { useFieldConfig } from '../hooks/useFieldConfig';
import type { FieldProps } from '../types';

export interface MarkdownCollapsedFieldSchema {
  title?: string;
  type?: string;
  widget?: 'markdown-collapsed';
  /** Open on first render. Defaults to closed — the point of the field is that it starts out of the way. */
  open?: boolean;
  [key: string]: unknown;
}

interface MarkdownCollapsedFieldProps extends FieldProps {
  schema: MarkdownCollapsedFieldSchema;
}

/**
 * Read-only Markdown behind a disclosure — detail that belongs on the form without being read every time.
 *
 * Raw `<details>` in a Markdown string cannot do this: the renderer runs no raw-HTML plugin, so the tags are
 * stripped and the content spills out in full. Empty content renders nothing at all rather than an opener
 * with nothing behind it.
 */
export const MarkdownCollapsedField: React.FC<MarkdownCollapsedFieldProps> = ({ name, schema, ui, form, disabled }) => {
  const config = useFieldConfig(name, schema, ui, disabled);
  const uiConfig = ui as { title?: string; open?: boolean } | undefined;
  const [open, setOpen] = useState(uiConfig?.open ?? schema.open ?? false);
  const title = uiConfig?.title || schema.title || 'Details';

  return (
    <Controller
      name={name}
      control={form.control}
      defaultValue={config.defaultValue || ''}
      render={({ field }) => {
        const content = String(field.value ?? '');
        if (!content.trim()) return <></>;
        return (
          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger className="flex w-full items-center gap-1 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              <ChevronRight className={`size-4 transition-transform ${open ? 'rotate-90' : ''}`} />
              {title}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <MarkdownContent content={content} />
            </CollapsibleContent>
          </Collapsible>
        );
      }}
    />
  );
};
