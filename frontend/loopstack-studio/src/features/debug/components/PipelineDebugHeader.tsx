import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import PipelineDebugLegend from './PipelineDebugLegend.tsx';

interface PipelineDebugHeaderProps {
  title: string;
  runNumber?: number;
  onBack: () => void;
}

const PipelineDebugHeader: React.FC<PipelineDebugHeaderProps> = ({ title, runNumber, onBack }) => {
  return (
    <div className="flex items-center justify-between pb-2">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 rounded-full">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Pipeline Flow Visualization {runNumber && `· Run #${runNumber}`}
          </p>
        </div>
      </div>

      <div className="hidden items-center gap-6 sm:flex">
        <PipelineDebugLegend />
      </div>
    </div>
  );
};

export default PipelineDebugHeader;
