import React from 'react';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import CompletionMessagePaper from '@/components/messages/CompletionMessagePaper.tsx';
import type { ModelMessage } from '@/types/ai.types';
import MessageContentRenderer from './AiMessageContent.tsx';

interface DocumentMessageRendererProps {
  document: Omit<DocumentItemInterface, 'content'> & { content: ModelMessage };
}

const DocumentMessageRenderer: React.FC<DocumentMessageRendererProps> = ({ document }) => {
  const content = document.content;

  return (
    <CompletionMessagePaper>
      <MessageContentRenderer message={content} />
    </CompletionMessagePaper>
  );
};

export default DocumentMessageRenderer;
