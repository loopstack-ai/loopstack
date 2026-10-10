import { Info } from 'lucide-react';
import React from 'react';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import MarkdownContent from '@/components/dynamic-form/MarkdownContent.tsx';
import CompletionMessagePaper from '@/components/messages/CompletionMessagePaper.tsx';

type MessageRole = 'system' | 'user' | 'assistant' | 'tool' | 'error' | 'document';

interface MessagePayload {
  role?: string;
  text?: string;
}

const KNOWN_ROLES: MessageRole[] = ['system', 'user', 'assistant', 'tool', 'error', 'document'];

const DocumentMessageRenderer: React.FC<{ document: DocumentItemInterface }> = ({ document }) => {
  const { role, text } = document.content as MessagePayload;
  const renderedRole = (KNOWN_ROLES as string[]).includes(role ?? '') ? (role as MessageRole) : undefined;

  // System messages are status/log lines, not conversation — render them as a quiet, compact line
  // (no Card, no "SYSTEM" label) with one consistent icon rather than per-message emojis.
  if (renderedRole === 'system') {
    return (
      <div className="text-muted-foreground flex items-start gap-1.5 px-1 py-0.5 text-sm leading-relaxed [&_p]:m-0">
        <Info className="mt-0.5 size-3.5 shrink-0 opacity-70" />
        <div className="min-w-0">
          <MarkdownContent content={text ?? ''} />
        </div>
      </div>
    );
  }

  return (
    <CompletionMessagePaper role={renderedRole}>
      <MarkdownContent content={text ?? ''} />
    </CompletionMessagePaper>
  );
};

export default DocumentMessageRenderer;
