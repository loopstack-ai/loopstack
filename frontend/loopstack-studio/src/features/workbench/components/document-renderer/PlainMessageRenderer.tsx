import React from 'react';
import CompletionMessagePaper from '../../../../components/messages/CompletionMessagePaper.tsx';

interface PlainMessageRendererProps {
  document: any; //TODO: Define a more specific type for document
}

const PlainMessageRenderer: React.FC<PlainMessageRendererProps> = ({ document }) => {
  return <CompletionMessagePaper>{document.content.text}</CompletionMessagePaper>;
};

export default PlainMessageRenderer;
