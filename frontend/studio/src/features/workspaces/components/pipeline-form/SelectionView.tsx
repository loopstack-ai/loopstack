import { Loader2, Play } from 'lucide-react';
import type { PipelineConfigDto } from '@loopstack/api-client';
import { Button } from '@/components/ui/button.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import HeaderSection from '@/features/workspaces/components/pipeline-form/HeaderSection.tsx';

const SelectionView = ({
  title,
  pipelineTypes,
  formData,
  errors,
  isLoading,
  onInputChange,
  onNext,
}: {
  title: string;
  pipelineTypes: PipelineConfigDto[];
  formData: { blockName: string };
  errors: { blockName: string };
  isLoading: boolean;
  onInputChange: (field: string, value: string) => void;
  onNext: () => void;
}) => {
  const selectedConfig = pipelineTypes.find((p) => p.blockName === formData.blockName);

  return (
    <div className="flex flex-col">
      <HeaderSection
        icon={<Play className="h-5 w-5" />}
        title={title}
        description="Choose an automation type to get started"
      />

      <div className="mb-6 px-1">
        <div className="space-y-2">
          <label htmlFor="automation" className="text-foreground block text-sm font-medium">
            Automation Type
          </label>
          <div className="flex gap-2">
            <Select
              value={formData.blockName}
              onValueChange={(value) => onInputChange('blockName', value)}
              disabled={isLoading}
            >
              <SelectTrigger
                id="automation"
                className={`flex-1 ${errors.blockName ? 'border-red-500 focus:ring-red-500' : ''}`}
              >
                <SelectValue placeholder="Select an automation..." />
              </SelectTrigger>
              <SelectContent>
                {pipelineTypes.map((item) => (
                  <SelectItem key={item.blockName} value={item.blockName}>
                    {item.title ?? item.blockName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="default" disabled={isLoading || !formData.blockName} onClick={onNext} className="px-4">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            </Button>
          </div>
          {errors.blockName && <p className="mt-1 flex items-center gap-1 text-sm text-red-500">{errors.blockName}</p>}
        </div>

        {selectedConfig && (
          <div className="bg-muted/50 border-border mt-4 rounded-lg border p-4">
            <h3 className="text-foreground mb-1 text-sm font-medium">
              {selectedConfig.title || selectedConfig.blockName}
            </h3>
            {selectedConfig.description && (
              <p className="text-muted-foreground text-sm leading-relaxed">{selectedConfig.description}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectionView;
