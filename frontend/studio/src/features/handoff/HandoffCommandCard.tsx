import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import type { DocumentRendererProps } from '@/features/documents/DocumentRenderer';

interface HandoffContent {
  title: string;
  description?: string;
  command: string;
}

/**
 * Renderer for `handoff`-tagged documents: a copy-to-clipboard command card. Used both inline in the run
 * timeline (via the widget registry) and in the Handoff sidebar panel.
 */
export function HandoffCommandCard({ document }: DocumentRendererProps) {
  const content = (document.content ?? {}) as HandoffContent;
  const [copied, setCopied] = useState(false);

  if (!content.command) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(content.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-1">
      {content.title && <div className="text-sm font-medium">{content.title}</div>}
      {content.description && <p className="text-muted-foreground text-xs">{content.description}</p>}
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
    </div>
  );
}
