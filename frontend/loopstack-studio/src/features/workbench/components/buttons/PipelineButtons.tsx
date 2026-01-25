import { Hammer } from 'lucide-react';
import React from 'react';
import type { PipelineDto } from '@loopstack/api-client';
import { Button } from '../../../../components/ui/button.tsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../../components/ui/tooltip.tsx';
import { useRunPipeline } from '../../../../hooks/useProcessor.ts';

interface PipelineButtonsProps {
  pipeline: PipelineDto;
}

const PipelineButtons: React.FC<PipelineButtonsProps> = ({ pipeline }) => {
  const runPipeline = useRunPipeline();

  const handlePing = () => {
    runPipeline.mutate({
      pipelineId: pipeline.id,
      runPipelinePayloadDto: {},
      force: false,
    });
  };

  return (
    <div className="ml-3">
      <div className="flex">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="sm"
                onClick={handlePing}
                disabled={runPipeline.isPending}
                className="ml-3.5 h-8 w-8 bg-transparent p-0 text-black hover:bg-gray-100"
              >
                {runPipeline.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Hammer className="w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ping pipeline</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default PipelineButtons;
