import React from 'react';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import { cn } from '../../lib/utils.ts';
import { Card } from '../ui/card';
import DocumentBoxActions from './DocumentBoxActions.tsx';

interface CompletionMessagePaperProps {
  document: DocumentItemInterface;
  /** The speaker of a message document; a `user` message aligns to the right. */
  role?: 'system' | 'user' | 'assistant' | 'tool' | 'error' | 'document';
  /** What the copy action copies; the document content as JSON when not given. */
  copyText?: string;
  children: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
}

const CompletionMessagePaper: React.FC<CompletionMessagePaperProps> = ({
  document,
  role,
  copyText,
  children,
  fullWidth = false,
  className,
}) => {
  const isUser = role === 'user';

  return (
    <div
      className={cn(
        'animate-in fade-in mb-1 flex flex-row items-start duration-300',
        isUser ? 'justify-end' : 'justify-start',
        className,
      )}
    >
      <div
        className={cn(
          'flex min-w-50 flex-col',
          fullWidth ? 'w-full max-w-full' : 'w-auto max-w-[75%]',
          isUser ? 'items-end' : 'items-start',
        )}
      >
        <Card
          className={cn(
            'group/document relative max-w-full p-4 wrap-break-word shadow-none',
            fullWidth ? 'w-full' : 'w-auto',
          )}
        >
          <DocumentBoxActions document={document} role={role} copyText={copyText} />
          <div className="text-foreground leading-relaxed wrap-break-word whitespace-pre-wrap">
            <div className="message-content">{children}</div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CompletionMessagePaper;
