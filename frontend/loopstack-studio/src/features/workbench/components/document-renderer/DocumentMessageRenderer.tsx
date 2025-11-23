import React from 'react';
import CompletionMessagePaper from '../../../../components/messages/CompletionMessagePaper.tsx';
import type { ModelMessage } from 'ai';
import MessageContentRenderer from './AiMessageContent.tsx';
import type { DocumentItemInterface } from '@loopstack/shared';

interface DocumentMessageRendererProps {
  document: DocumentItemInterface;
}

const DocumentMessageRenderer: React.FC<DocumentMessageRendererProps> = ({ document }) => {
  const content = document.content as ModelMessage;

  return (
    <CompletionMessagePaper role={content.role} timestamp={new Date(document.createdAt)}>
      <div>
        <MessageContentRenderer message={content} />
      </div>
    </CompletionMessagePaper>
  );
};

export default DocumentMessageRenderer;
