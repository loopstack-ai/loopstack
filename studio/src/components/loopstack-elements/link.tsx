'use client';

import { ChevronDownIcon, ChevronUpIcon, ExternalLinkIcon, FolderClosedIcon, FolderOpenIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { EmbeddedWorkflow } from './EmbeddedWorkflow';

export type LinkCardStatus = 'pending' | 'success' | 'failure';

export type LinkCardProps = {
  href?: string;
  label?: string;
  status?: LinkCardStatus;
  embed?: boolean;
  defaultExpanded?: boolean;
  className?: string;
};

const statusColorMap: Record<LinkCardStatus, string> = {
  pending: 'text-muted-foreground',
  success: 'text-green-600',
  failure: 'text-red-600',
};

const WORKFLOW_HREF_PATTERN = /^\/workflows\/([a-zA-Z0-9_-]+)$/;

export const LinkCard = ({ className, href, label, status = 'pending', embed, defaultExpanded }: LinkCardProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  // `defaultExpanded === undefined` means the caller is still loading status — defer locking in
  // the initial expanded value until it arrives, otherwise useState's first call wins forever.
  const initializedRef = useRef(defaultExpanded !== undefined);

  useEffect(() => {
    if (initializedRef.current || defaultExpanded === undefined) return;
    setExpanded(defaultExpanded);
    initializedRef.current = true;
  }, [defaultExpanded]);

  // Extract domain for display if no label provided
  const displayLabel =
    label ||
    (() => {
      if (!href) return '';
      try {
        const url = new URL(href);
        return url.hostname.replace('www.', '');
      } catch {
        return href;
      }
    })();

  // Check if href points to an internal workflow
  const workflowMatch = href?.match(WORKFLOW_HREF_PATTERN);
  const workflowId = workflowMatch?.[1] ?? null;
  const canEmbed = embed === true && workflowId != null;

  useEffect(() => {
    if (status === 'success' || status === 'failure') {
      setExpanded(false);
    }
  }, [status]);

  return (
    <div className={cn('not-prose flex w-full flex-col', className)}>
      <div
        className={cn('flex w-full items-center gap-1.5 py-1', canEmbed && 'cursor-pointer')}
        onClick={() => canEmbed && setExpanded((v) => !v)}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn('flex shrink-0 items-center', statusColorMap[status])}>
              {expanded ? <FolderOpenIcon className="size-4" /> : <FolderClosedIcon className="size-4" />}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">{expanded ? 'Collapse' : 'Expand'}</TooltipContent>
        </Tooltip>
        <span className={cn('min-w-0 flex-1 truncate text-sm', expanded ? 'font-medium' : 'text-muted-foreground')}>
          {displayLabel}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
            >
              <ExternalLinkIcon className="size-3.5" />
            </a>
          )}
          {canEmbed &&
            (expanded ? (
              <ChevronUpIcon className="text-muted-foreground size-3.5" />
            ) : (
              <ChevronDownIcon className="text-muted-foreground size-3.5" />
            ))}
        </div>
      </div>

      {/* Rendered in place rather than in an iframe: one app, one connection, one query cache — and a
          collapsed card costs nothing, because the subtree is never mounted. */}
      {expanded && canEmbed && (
        <div className="mt-2 border-t">
          <EmbeddedWorkflow workflowId={workflowId} />
        </div>
      )}
    </div>
  );
};

export default LinkCard;
