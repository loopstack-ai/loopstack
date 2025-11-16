import React from 'react';
import CompletionMessagePaper from '../../../../../components/messages/CompletionMessagePaper.tsx';

interface PlainMessageRendererProps {
  document: any; //TODO: Define a more specific type for document
}

const PlainMessageRenderer: React.FC<PlainMessageRendererProps> = ({ document }) => {
  return (
    <CompletionMessagePaper role={document.content.title ?? 'plain'}>
      <div className="ml-8">{document.content.content}</div>
    </CompletionMessagePaper>
  );
};

export default PlainMessageRenderer;
