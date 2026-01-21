import React from 'react';
import type { ModelMessage } from 'ai';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import CompletionMessagePaper from '../../../../components/messages/CompletionMessagePaper.tsx';
import MessageContentRenderer from './AiMessageContent.tsx';

interface DocumentMessageRendererProps {
  document: DocumentItemInterface;
}

const DocumentMessageRenderer: React.FC<DocumentMessageRendererProps> = ({ document }) => {
  const content = document.content as ModelMessage;

  return (
    <CompletionMessagePaper role={content.role} timestamp={new Date(document.createdAt)}>
      <MessageContentRenderer message={content} />
    </CompletionMessagePaper>
  );
};

export default DocumentMessageRenderer;
