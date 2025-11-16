import React from 'react';
import CompletionMessagePaper from '../../../../components/messages/CompletionMessagePaper.tsx';
import MarkdownContent from '../../../../components/dynamic-form/MarkdownContent.tsx';

interface MarkdownMessageRendererProps {
  document: any; //TODO: Define a more specific type for document
}

const MarkdownMessageRenderer: React.FC<MarkdownMessageRendererProps> = ({ document }) => {
  return (
    <CompletionMessagePaper role={document.content.title ?? 'plain'}>
      <div className="ml-8">
        <MarkdownContent content={document.content.markdown} />
      </div>
    </CompletionMessagePaper>
  );
};

export default MarkdownMessageRenderer;
