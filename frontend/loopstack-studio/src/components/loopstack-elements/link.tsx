'use client';

import { ChevronDownIcon, ChevronUpIcon, ExternalLinkIcon, LinkIcon, icons } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const EMBED_RESIZE_MESSAGE_TYPE = 'loopstack:embed:resize';

export type LucideIconName = keyof typeof icons;

export type LinkCardProps = {
  href?: string;
  label?: string;
  caption?: string;
  icon?: LucideIconName;
  type?: string;
  iconClassName?: string;
  className?: string;
};

const PIPELINE_HREF_PATTERN = /^\/pipelines\/([a-zA-Z0-9_-]+)$/;

export const LinkCard = ({ className, href, label, caption, icon, type, iconClassName }: LinkCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [iframeHeight, setIframeHeight] = useState(0);

  // Get the icon component from lucide-react icons object
  const IconComponent = icon && icons[icon] ? icons[icon] : LinkIcon;

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

  const isSuccess = type === 'success';

  // Check if href points to an internal pipeline
  const pipelineMatch = href?.match(PIPELINE_HREF_PATTERN);
  const pipelineId = pipelineMatch?.[1] ?? null;
  const embedSrc = pipelineId ? `/embed/pipelines/${pipelineId}` : null;

  // Listen for resize messages from the embedded iframe
  useEffect(() => {
    if (!pipelineId || !expanded) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== EMBED_RESIZE_MESSAGE_TYPE) return;
      if (event.data?.pipelineId !== pipelineId) return;

      const height = event.data?.height;
      if (typeof height === 'number' && height > 0) {
        setIframeHeight(height);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [pipelineId, expanded]);

  return (
    <div className={cn('not-prose flex w-full flex-col rounded-md border bg-background', className)}>
      <div className="flex w-full items-center gap-3 p-3">
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-md border',
            isSuccess ? 'bg-green-50 text-green-600 border-green-200' : 'text-muted-foreground bg-muted/50',
          )}
        >
          <IconComponent className={cn('size-4', iconClassName)} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{displayLabel}</span>
          {caption ? (
            <span className="text-muted-foreground truncate text-xs">{caption}</span>
          ) : (
            href && (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground truncate text-xs hover:underline"
              >
                {href}
              </a>
            )
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {embedSrc && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-muted-foreground hover:text-foreground flex size-7 items-center justify-center rounded-md transition-colors hover:bg-muted/50"
            >
              {expanded ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
            </button>
          )}
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground flex size-7 items-center justify-center rounded-md transition-colors hover:bg-muted/50"
            >
              <ExternalLinkIcon className="size-4" />
            </a>
          )}
        </div>
      </div>

      {expanded && embedSrc && (
        <div className="border-t">
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
