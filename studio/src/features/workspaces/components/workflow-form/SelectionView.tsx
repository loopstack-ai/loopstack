import { Loader2, Play } from 'lucide-react';
import type { WorkflowConfigInterface } from '@loopstack/contracts/api';
import { Button } from '@/components/ui/button.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import HeaderSection from '@/features/workspaces/components/workflow-form/HeaderSection.tsx';

const SelectionView = ({
  title,
  workflowTypes,
  formData,
  errors,
  isLoading,
  onInputChange,
  onNext,
}: {
  title: string;
  workflowTypes: WorkflowConfigInterface[];
  formData: { workflowName: string };
  errors: { workflowName: string };
  isLoading: boolean;
  onInputChange: (field: string, value: string) => void;
  onNext: () => void;
}) => {
  const selectedConfig = workflowTypes.find((p) => p.workflowName === formData.workflowName);

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
              value={formData.workflowName}
              onValueChange={(value) => onInputChange('workflowName', value)}
              disabled={isLoading}
            >
              <SelectTrigger
                id="automation"
                className={`flex-1 ${errors.workflowName ? 'border-red-500 focus:ring-red-500' : ''}`}
              >
                <SelectValue placeholder="Select an automation..." />
              </SelectTrigger>
              <SelectContent>
                {workflowTypes.map((item) => (
                  <SelectItem key={item.workflowName} value={item.workflowName}>
                    {item.title ?? item.workflowName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="default" disabled={isLoading || !formData.workflowName} onClick={onNext} className="px-4">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            </Button>
          </div>
          {errors.workflowName && (
            <p className="mt-1 flex items-center gap-1 text-sm text-red-500">{errors.workflowName}</p>
          )}
        </div>

        {selectedConfig && (
          <div className="bg-muted/50 border-border mt-4 rounded-lg border p-4">
            <h3 className="text-foreground mb-1 text-sm font-medium">
              {selectedConfig.title || selectedConfig.workflowName}
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
