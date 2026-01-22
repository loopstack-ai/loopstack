import React from 'react';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import MarkdownContent from '../../../../components/dynamic-form/MarkdownContent.tsx';
import CompletionMessagePaper from '../../../../components/messages/CompletionMessagePaper.tsx';

type MarkdownMessageContentType = {
  markdown: string;
};

interface MarkdownMessageRendererProps {
  document: Omit<DocumentItemInterface, 'content'> & { content: MarkdownMessageContentType };
}

const MarkdownMessageRenderer: React.FC<MarkdownMessageRendererProps> = ({ document }) => {
  return (
    <CompletionMessagePaper>
      <MarkdownContent content={document.content.markdown} />
    </CompletionMessagePaper>
  );
};

export default MarkdownMessageRenderer;
