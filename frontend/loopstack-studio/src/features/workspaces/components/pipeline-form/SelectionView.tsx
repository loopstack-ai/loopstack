import { Loader2, Play } from 'lucide-react';
import type { PipelineConfigDto } from '@loopstack/api-client';
import { Button } from '@/components/ui/button.tsx';
import HeaderSection from '@/features/workspaces/components/pipeline-form/HeaderSection.tsx';

const SelectionView = ({
                         title,
                         pipelineTypes,
                         formData,
                         errors,
                         isLoading,
                         onInputChange,
                         onNext,
                         buttonLabel,
                       }: {
  title: string;
  pipelineTypes: PipelineConfigDto[];
  formData: { configKey: string };
  errors: { configKey: string };
  isLoading: boolean;
  onInputChange: (field: string, value: string) => void;
  onNext: () => void;
  buttonLabel: string;
}) => {
  const selectedConfig = pipelineTypes.find((p) => p.configKey === formData.configKey);

  return (
    <div className="flex flex-col h-full">
      <HeaderSection
        icon={<Play className="w-5 h-5 text-primary-foreground" />}
        title={title}
        description="Choose an automation type to get started"
      />

      <div className="flex-1 overflow-y-auto mb-6 px-1">
        <div className="space-y-2">
          <label htmlFor="automation" className="block text-sm font-medium text-foreground">
            Automation Type
          </label>
          <select
            id="automation"
            value={formData.configKey}
            onChange={(e) => onInputChange('configKey', e.target.value)}
            disabled={isLoading}
            className={`w-full px-3 py-2.5 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
              errors.configKey ? 'border-red-500 focus:ring-red-500' : 'border-input'
            }`}
          >
            <option value="">Select an automation...</option>
            {pipelineTypes.map((item) => (
              <option key={item.configKey} value={item.configKey}>
                {item.title ?? item.configKey}
              </option>
            ))}
          </select>
          {errors.configKey && (
            <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
              {errors.configKey}
            </p>
          )}
        </div>

        {selectedConfig && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
            <h3 className="font-medium text-sm text-foreground mb-1">
              {selectedConfig.title || selectedConfig.configKey}
            </h3>
            {selectedConfig.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {selectedConfig.description}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="pt-4">
        <Button
          variant='default'
          disabled={isLoading}
          onClick={onNext}
          size={'lg'}
          className={'w-full font-medium'}
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          { buttonLabel }
        </Button>
      </div>
    </div>
  );
};

export default SelectionView;