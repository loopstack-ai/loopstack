import React from 'react';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import CompletionMessagePaper from '../../../../components/messages/CompletionMessagePaper.tsx';

type PlainMessageContentType = {
  text: string;
};

interface PlainMessageRendererProps {
  document: Omit<DocumentItemInterface, 'content'> & { content: PlainMessageContentType };
}

const PlainMessageRenderer: React.FC<PlainMessageRendererProps> = ({ document }) => {
  return <CompletionMessagePaper>{document.content.text}</CompletionMessagePaper>;
};

export default PlainMessageRenderer;
