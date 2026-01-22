import React from 'react';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import LinkCard, { type LucideIconName } from '@/components/loopstack-elements/link.tsx';

type LinkMessageContentType = {
  icon?: string;
  type?: string;
  label?: string;
  href: string;
};

interface LinkMessageRendererProps {
  document: Omit<DocumentItemInterface, 'content'> & { content: LinkMessageContentType };
}

const LinkMessageRenderer: React.FC<LinkMessageRendererProps> = ({ document }) => {
  const { icon, type, label, href } = document.content;

  return <LinkCard href={href} label={label} icon={icon as LucideIconName} type={type} />;
};

export default LinkMessageRenderer;
