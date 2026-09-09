import { Check, Copy, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import type { DocumentRendererProps } from '@/features/documents/DocumentRenderer';

interface HandoffContent {
  title: string;
  description?: string;
  command?: string;
  url?: string;
}

/**
 * Renderer for `handoff`-tagged documents. Two shapes: a `command` renders a copy-to-clipboard card; a `url`
 * renders an "open in a new tab" link card. Used both inline in the run timeline (via the widget registry)
 * and in the Handoff sidebar panel.
 */
export function HandoffCommandCard({ document }: DocumentRendererProps) {
  const content = (document.content ?? {}) as HandoffContent;
  const [copied, setCopied] = useState(false);

  if (!content.command && !content.url) return null;

  const copy = async () => {
    if (!content.command) return;
    await navigator.clipboard.writeText(content.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-1">
      {content.title && <div className="text-sm font-medium">{content.title}</div>}
      {content.description && <p className="text-muted-foreground text-xs">{content.description}</p>}
      {content.url ? (
        <a
          href={content.url}
          target="_blank"
          rel="noreferrer"
          className="bg-muted/50 hover:bg-muted group relative flex w-full items-center rounded-md border p-3 text-left"
          title="Open in a new tab"
        >
          <code className="block break-all pr-6 font-mono text-xs">{content.url}</code>
          <ExternalLink className="text-muted-foreground absolute right-2 top-2 h-4 w-4" />
        </a>
      ) : (
        <button
          type="button"
          onClick={() => void copy()}
          className="bg-muted/50 hover:bg-muted group relative w-full rounded-md border p-3 text-left"
          title="Click to copy"
        >
          <code className="block break-all pr-6 font-mono text-xs">{content.command}</code>
          <span className="text-muted-foreground absolute right-2 top-2">
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          </span>
        </button>
      )}
    </div>
  );
}
