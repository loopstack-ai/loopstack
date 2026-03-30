import React from 'react';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import LinkCard, { type LinkCardStatus } from '@/components/loopstack-elements/link.tsx';

type LinkMessageContentType = {
  status?: LinkCardStatus;
  label?: string;
  href: string;
  embed?: boolean;
  expanded?: boolean;
};

interface LinkMessageRendererProps {
  document: Omit<DocumentItemInterface, 'content'> & { content: LinkMessageContentType };
}

const LinkMessageRenderer: React.FC<LinkMessageRendererProps> = ({ document }) => {
  const { status, label, href, embed, expanded } = document.content;

  return <LinkCard href={href} label={label} status={status} embed={embed} defaultExpanded={expanded} />;
};

export default LinkMessageRenderer;
