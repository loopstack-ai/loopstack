'use client';

import { CheckCircleIcon, ChevronDownIcon, CircleIcon, ClockIcon, XCircleIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { isValidElement } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ToolUIPart } from '@/types/ai.types';
import { CodeBlock } from '../ai-elements/code-block';

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible className={cn('not-prose mt-3 w-full', className)} {...props} />
);

export type ToolHeaderProps = {
  title?: string;
  type: ToolUIPart['type'];
  state: ToolUIPart['state'];
  className?: string;
};

type ToolState = ToolUIPart['state'];

const statusConfig: Record<ToolState, { label: string; icon: ReactNode }> = {
  'input-streaming': {
    label: 'Pending',
    icon: <CircleIcon className="size-4" />,
  },
  'input-available': {
    label: 'Running',
    icon: <ClockIcon className="size-4 animate-pulse" />,
  },
  'approval-requested': {
    label: 'Awaiting Approval',
    icon: <ClockIcon className="size-4 text-yellow-600" />,
  },
  'approval-responded': {
    label: 'Responded',
    icon: <CheckCircleIcon className="size-4 text-blue-600" />,
  },
  'output-available': {
    label: 'Completed',
    icon: <CheckCircleIcon className="size-4 text-green-600" />,
  },
  'output-error': {
    label: 'Error',
    icon: <XCircleIcon className="size-4 text-red-600" />,
  },
  'output-denied': {
    label: 'Denied',
    icon: <XCircleIcon className="size-4 text-orange-600" />,
  },
};

export const ToolHeader = ({ className, title, type, state, ...props }: ToolHeaderProps) => (
  <CollapsibleTrigger className={cn('flex w-full items-center justify-between gap-3 py-1', className)} {...props}>
    <div className="flex items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-muted-foreground flex shrink-0 items-center">{statusConfig[state].icon}</span>
        </TooltipTrigger>
        <TooltipContent side="top">{statusConfig[state].label}</TooltipContent>
      </Tooltip>
      <span className="text-muted-foreground text-sm">{title ?? type.split('-').slice(1).join('-')}</span>
    </div>
    <ChevronDownIcon className="text-muted-foreground size-4 transition-transform group-data-[state=open]:rotate-180" />
  </CollapsibleTrigger>
);

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground data-[state=closed]:animate-out data-[state=open]:animate-in outline-none',
      className,
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<'div'> & {
  input: ToolUIPart['input'];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn('space-y-2 overflow-hidden py-2', className)} {...props}>
    <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Parameters</h4>
    <div className="bg-muted/50 rounded-md">
      <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
    </div>
  </div>
);

export type ToolOutputProps = ComponentProps<'div'> & {
  output: unknown;
  errorText: ToolUIPart['errorText'];
};

const VALUE_PREVIEW_CHARS = 150;

const truncateForDisplay = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return value.length > VALUE_PREVIEW_CHARS ? value.slice(0, VALUE_PREVIEW_CHARS) + '...' : value;
  }
  if (Array.isArray(value)) {
    const head = value.slice(0, 5).map(truncateForDisplay);
    if (value.length > 5) head.push(`... (${value.length - 5} more)`);
    return head;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, truncateForDisplay(v)]),
    );
  }
  return value;
};

export const ToolOutput = ({ className, output, errorText, ...props }: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  let Output = <div>{output as ReactNode}</div>;

  if (typeof output === 'object' && !isValidElement(output)) {
    Output = <CodeBlock code={JSON.stringify(truncateForDisplay(output), null, 2)} language="json" />;
  } else if (typeof output === 'string') {
    const displayed = output.length > VALUE_PREVIEW_CHARS ? output.slice(0, VALUE_PREVIEW_CHARS) + '...' : output;
    Output = <CodeBlock code={displayed} language="json" />;
  }

  return (
    <div className={cn('space-y-2 py-2', className)} {...props}>
      <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {errorText ? 'Error' : 'Result'}
      </h4>
      <div
        className={cn(
          'overflow-x-auto rounded-md text-xs [&_table]:w-full',
          errorText ? 'bg-destructive/10 text-destructive' : 'bg-muted/50 text-foreground',
        )}
      >
        {errorText && <div>{errorText}</div>}
        {Output}
      </div>
    </div>
  );
};
