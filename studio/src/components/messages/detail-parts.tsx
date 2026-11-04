import { CheckIcon, CopyIcon } from 'lucide-react';
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';

export const formatDate = (date: Date | string): string => {
  try {
    return new Date(date).toLocaleString();
  } catch {
    return String(date);
  }
};

export const DetailRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid min-w-0 grid-cols-[7.5rem_1fr] gap-x-3 gap-y-0.5 text-sm">
    <span className="text-muted-foreground font-medium">{label}</span>
    <span className="min-w-0 wrap-break-word">{children}</span>
  </div>
);

export const CopyableId = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <span className="flex w-full min-w-0 items-center gap-1.5">
      <code className="bg-muted min-w-0 flex-1 truncate rounded px-1.5 py-0.5 font-mono text-xs">{value}</code>
      <Button type="button" variant="ghost" size="icon" className="size-6 shrink-0" onClick={handleCopy}>
        {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
      </Button>
    </span>
  );
};

export const BadgeList = ({ items, emptyLabel = 'None' }: { items?: string[] | null; emptyLabel?: string }) => {
  if (!items?.length) return <span className="text-muted-foreground">{emptyLabel}</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Badge key={item} variant="outline" className="text-xs">
          {item}
        </Badge>
      ))}
    </span>
  );
};
