'use client';

import { ExternalLinkIcon, LinkIcon, icons } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export type LucideIconName = keyof typeof icons;

export type LinkCardProps = ComponentProps<'a'> & {
  href?: string;
  label?: string;
  icon?: LucideIconName;
  iconClassName?: string;
};

export const LinkCard = ({ className, href, label, icon, iconClassName, ...props }: LinkCardProps) => {
  // Get the icon component from lucide-react icons object
  const IconComponent = icon && icons[icon] ? icons[icon] : LinkIcon;

  // Extract domain for display if no label provided
  const displayLabel =
    label ||
    (() => {
      if (!href) return '';
      try {
        const url = new URL(href);
        return url.hostname.replace('www.', '');
      } catch {
        return href;
      }
    })();

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'not-prose flex w-full items-center gap-3 rounded-md border p-3',
        'bg-background hover:bg-muted/50 transition-colors',
        'group cursor-pointer',
        className,
      )}
      {...props}
    >
      <div className="text-muted-foreground bg-muted/50 flex size-8 shrink-0 items-center justify-center rounded-md border">
        <IconComponent className={cn('size-4', iconClassName)} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium group-hover:underline">{displayLabel}</span>
        <span className="text-muted-foreground truncate text-xs">{href}</span>
      </div>
      <ExternalLinkIcon className="text-muted-foreground size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
    </a>
  );
};

export default LinkCard;
