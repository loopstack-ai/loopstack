import React from 'react';

const PipelineDebugLegend: React.FC = () => {
  return (
    <div className="flex items-center gap-4 text-xs font-medium">
      <div className="flex items-center gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
        <span className="text-muted-foreground/80">Start</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="bg-primary h-2.5 w-2.5 rounded-full" />
        <span className="text-muted-foreground/80">Current</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="bg-muted h-2.5 w-2.5 rounded-full" />
        <span className="text-muted-foreground/80">Visited</span>
      </div>
    </div>
  );
};

export default PipelineDebugLegend;
