import { Check, Copy, Loader2 } from 'lucide-react';
import { useState } from 'react';
import CompletionMessagePaper from '@/components/messages/CompletionMessagePaper.tsx';
import { Button } from '@/components/ui/button.tsx';
import type { DocumentRendererProps } from '@/features/documents/DocumentRenderer';
import { useDocumentTransition } from '@/features/documents/renderers/useDocumentTransition.ts';
import { useDocumentConfigs } from '@/hooks/useConfig';

interface TerminalHandoffContent {
  command: string;
  cwd?: string;
}

/**
 * Renderer for the `terminal-handoff` document: the command a `loopstack run` follower hands its terminal
 * to, shown as a copy-to-clipboard block, plus a button that fires the document's transition by hand. The
 * CLI fires that transition when the handed-over process exits; the button is for when no CLI is following
 * the run — the terminal was closed, or the session was started from Studio — so the run can still be
 * released and tear its container down.
 */
export function TerminalHandoffCard({ parentWorkflow, workflow, document, isActive }: DocumentRendererProps) {
  const content = (document.content ?? {}) as TerminalHandoffContent;
  const documentConfigs = useDocumentConfigs();
  const docConfig = documentConfigs.get(document.documentName);
  const { submit, canSubmit, isLoading } = useDocumentTransition(parentWorkflow, workflow, docConfig);
  const [copied, setCopied] = useState(false);

  if (!content.command) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(content.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const open = isActive && canSubmit;

  return (
    <CompletionMessagePaper role="document" fullWidth={true} timestamp={new Date(document.createdAt)}>
      <div className="flex flex-col gap-3 p-1">
        <div className="space-y-1">
          <div className="text-sm font-medium">Interactive session</div>
          <p className="text-muted-foreground text-xs">
            Run this in a terminal to continue the session. Following the run with <code>loopstack run</code> does it
            for you and ends the session when the command exits.
            {content.cwd && (
              <>
                {' '}
                Working directory: <code>{content.cwd}</code>
              </>
            )}
          </p>
        </div>
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
        {open ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs">
              Closed the terminal without finishing? End the session here to release the run.
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => submit({})}
              className="shrink-0"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              End session
            </Button>
          </div>
        ) : (
          <div className="text-muted-foreground text-xs">Session ended.</div>
        )}
      </div>
    </CompletionMessagePaper>
  );
}
