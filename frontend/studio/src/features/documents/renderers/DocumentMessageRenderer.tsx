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

  return (
    <CompletionMessagePaper role={renderedRole}>
      <MarkdownContent content={text ?? ''} />
    </CompletionMessagePaper>
  );
};

export default DocumentMessageRenderer;
