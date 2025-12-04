import { Loader2, Play } from 'lucide-react';
import type { PipelineConfigDto } from '@loopstack/api-client';
import { Button } from '@/components/ui/button.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
        icon={<Play className="w-5 h-5" />}
        title={title}
        description="Choose an automation type to get started"
      />

      <div className="mb-6 px-1">
        <div className="space-y-2">
          <label htmlFor="automation" className="block text-sm font-medium text-foreground">
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
                className={`flex-1 ${
                  errors.blockName ? 'border-red-500 focus:ring-red-500' : ''
                }`}
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
            <Button
              variant="default"
              disabled={isLoading || !formData.blockName}
              onClick={onNext}
              className="px-4"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
          </div>
          {errors.blockName && (
            <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
              {errors.blockName}
            </p>
          )}
        </div>

        {selectedConfig && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
            <h3 className="font-medium text-sm text-foreground mb-1">
              {selectedConfig.title || selectedConfig.blockName}
            </h3>
            {selectedConfig.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {selectedConfig.description}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectionView;