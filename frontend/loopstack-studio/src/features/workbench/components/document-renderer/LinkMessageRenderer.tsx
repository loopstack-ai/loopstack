import React from 'react';
import LinkCard, { type LucideIconName } from '@/components/loopstack-elements/link.tsx';

interface LinkMessageRendererProps {
  document: {
    content: {
      icon?: string;
      type?: string;
      label?: string;
      href: string;
    };
  };
}

const LinkMessageRenderer: React.FC<LinkMessageRendererProps> = ({ document }) => {
  const { icon, type, label, href } = document.content;

  return <LinkCard href={href} label={label} icon={icon as LucideIconName} type={type} />;
};

export default LinkMessageRenderer;
