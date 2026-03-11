import { ExternalLink, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx';
import { useWorkbenchLayout } from '../providers/WorkbenchLayoutProvider.tsx';

export function WorkbenchPreviewPanel() {
  const { pipeline, getPreviewUrl, closeSidePanel } = useWorkbenchLayout();

  const previewUrl = getPreviewUrl?.(pipeline.id);

  return (
    <div className="border-l bg-background flex w-1/2 shrink-0 flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between px-3">
        <span className="text-sm font-medium">Preview</span>
        <div className="flex items-center gap-1">
          {previewUrl && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:cursor-pointer"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </TooltipTrigger>
              <TooltipContent side="bottom">Open in new tab</TooltipContent>
            </Tooltip>
          )}
          <button
            onClick={closeSidePanel}
            className="text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {previewUrl ? (
        <iframe src={previewUrl} className="flex-1 border-0" title="Pipeline preview" />
      ) : (
        <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
          Preview not available
        </div>
      )}
    </div>
  );
}
