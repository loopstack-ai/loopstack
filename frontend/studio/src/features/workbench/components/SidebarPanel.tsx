import { ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { PanelSize } from '../providers/WorkbenchLayoutProvider';

const PREV_SIZE: Record<PanelSize, PanelSize | null> = {
  small: null,
  medium: 'small',
  large: 'medium',
};

const NEXT_SIZE: Record<PanelSize, PanelSize | null> = {
  small: 'medium',
  medium: 'large',
  large: null,
};

interface SidebarPanelProps {
  icon: ReactNode;
  title: string;
  description?: string;
  size: PanelSize;
  onSizeChange: (size: PanelSize) => void;
  onClose: () => void;
  expandUrl?: string;
  children: ReactNode;
}

export function SidebarPanel({
  icon,
  title,
  description,
  size,
  onSizeChange,
  onClose,
  expandUrl,
  children,
}: SidebarPanelProps) {
  const canShrink = PREV_SIZE[size] !== null;
  const canGrow = NEXT_SIZE[size] !== null;

  return (
    <div className="border-l bg-background flex h-full shrink-0 flex-col">
      <div className="border-b flex h-12 shrink-0 items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-sm font-medium">{title}</span>
        </div>
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={!canGrow}
                onClick={() => canGrow && onSizeChange(NEXT_SIZE[size]!)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Expand</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={!canShrink}
                onClick={() => canShrink && onSizeChange(PREV_SIZE[size]!)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Shrink</TooltipContent>
          </Tooltip>
          {expandUrl && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                  <a href={expandUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Open in new tab</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Close</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {description && (
          <div className="shrink-0 border-b px-4 py-2">
            <p className="text-muted-foreground text-xs">{description}</p>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
