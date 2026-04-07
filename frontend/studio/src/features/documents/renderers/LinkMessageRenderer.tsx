import React from 'react';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import LinkCard, { type LinkCardStatus } from '@/components/loopstack-elements/link.tsx';

type LinkMessageContentType = {
  status?: LinkCardStatus;
  label?: string;
  workflowId?: string;
  embed?: boolean;
  expanded?: boolean;
};

interface LinkMessageRendererProps {
  document: Omit<DocumentItemInterface, 'content'> & { content: LinkMessageContentType };
}

const LinkMessageRenderer: React.FC<LinkMessageRendererProps> = ({ document }) => {
  const { status, label, workflowId, embed, expanded } = document.content;
  const href = workflowId ? `/workflows/${workflowId}` : undefined;

  return <LinkCard href={href} label={label} status={status} embed={embed} defaultExpanded={expanded} />;
};

export default LinkMessageRenderer;
