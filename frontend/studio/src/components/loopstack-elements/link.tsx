'use client';

import { ChevronDownIcon, ChevronUpIcon, ExternalLinkIcon, FolderClosedIcon, FolderOpenIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useStudio } from '@/providers/StudioProvider';

const EMBED_RESIZE_MESSAGE_TYPE = 'loopstack:embed:resize';

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
  const { router } = useStudio();
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const [iframeHeight, setIframeHeight] = useState(0);

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
  const embedSrc = canEmbed ? router.getEmbedWorkflow(workflowId) : null;

  // Listen for resize messages from the embedded iframe
  useEffect(() => {
    if (!workflowId || !expanded) return;

    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as Record<string, unknown> | null;
      if (data?.type !== EMBED_RESIZE_MESSAGE_TYPE) return;
      if (data?.workflowId !== workflowId) return;

      const height = data?.height;
      if (typeof height === 'number' && height > 0) {
        setIframeHeight(height);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [workflowId, expanded]);

  return (
    <div
      className={cn('not-prose flex w-full cursor-pointer flex-col', className)}
      onClick={() => embedSrc && setExpanded((v) => !v)}
    >
      <div className="flex w-full items-center gap-1.5 py-1">
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
          {embedSrc &&
            (expanded ? (
              <ChevronUpIcon className="text-muted-foreground size-3.5" />
            ) : (
              <ChevronDownIcon className="text-muted-foreground size-3.5" />
            ))}
        </div>
      </div>

      {expanded && embedSrc && (
        <div className="mt-2 border-t">
          <iframe
            src={embedSrc}
            className="w-full overflow-hidden border-0"
            style={{ height: `${iframeHeight}px` }}
            scrolling="no"
            title={displayLabel}
          />
        </div>
      )}
    </div>
  );
};

export default LinkCard;
