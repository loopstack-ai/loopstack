import React from 'react';

const PipelineDebugLegend: React.FC = () => {
  return (
    <div className="flex items-center gap-6 text-xs font-medium">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full border border-blue-500/50 bg-blue-500/20" />
        <span className="text-muted-foreground">Start</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative h-3 w-3">
          <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
          <span className="bg-primary border-background ring-primary/30 relative inline-flex h-3 w-3 rounded-full border-2 ring-1"></span>
        </div>
        <span className="text-foreground font-semibold">Current</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full border border-green-500/50 bg-green-500/20" />
        <span className="text-muted-foreground">End</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="border-border bg-muted/50 h-3 w-3 rounded-full border" />
        <span className="text-muted-foreground">Visited</span>
      </div>
      <div className="bg-border mx-2 h-4 w-px" />
      <div className="flex items-center gap-2">
        <div className="bg-primary h-0.5 w-4 rounded" />
        <span className="text-muted-foreground">Executed</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="border-muted-foreground/60 h-0.5 w-4 rounded border-t border-dashed" />
        <span className="text-muted-foreground">Potential</span>
      </div>
    </div>
  );
};

export default PipelineDebugLegend;
