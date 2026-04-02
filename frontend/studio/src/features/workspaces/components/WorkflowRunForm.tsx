import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { WorkspaceInterface } from '@loopstack/contracts/api';
import type { WorkflowConfigInterface } from '@loopstack/contracts/types';
import ErrorSnackbar from '@/components/feedback/ErrorSnackbar';
import ArgumentsView from '@/features/workspaces/components/workflow-form/ArgumentsView.tsx';
import SelectionView from '@/features/workspaces/components/workflow-form/SelectionView.tsx';
import { useWorkflowConfig } from '@/hooks/useConfig.ts';
import { useRunWorkflow } from '@/hooks/useProcessor.ts';
import { useCreateWorkflow } from '@/hooks/useWorkflows.ts';
import { useStudio } from '@/providers/StudioProvider.tsx';

interface WorkflowFormProps {
  title: string;
  workspace: WorkspaceInterface;
  onSuccess?: () => void;
}

type Step = 'selection' | 'arguments';

const WorkflowForm = ({ title, workspace }: WorkflowFormProps) => {
  const { router } = useStudio();

  const createWorkflow = useCreateWorkflow();
  const pingWorkflow = useRunWorkflow();

  const fetchWorkflowTypes = useWorkflowConfig(workspace.blockName);

  const [currentStep, setCurrentStep] = useState<Step>('selection');
  const [formData, setFormData] = useState({
    name: '',
    blockName: '',
    properties: {},
  });

  const [errors, setErrors] = useState({
    name: '',
    blockName: '',
  });

  const selectedWorkflowConfig: WorkflowConfigInterface | undefined = useMemo(() => {
    if (!formData.blockName || !fetchWorkflowTypes.data) return undefined;
    return fetchWorkflowTypes.data.find((p) => p.blockName === formData.blockName);
  }, [formData.blockName, fetchWorkflowTypes.data]);

  const hasArguments = !!selectedWorkflowConfig?.schema;
  const isLoading = createWorkflow.isPending || pingWorkflow.isPending;

  useEffect(() => {
    if (!formData.blockName && fetchWorkflowTypes.data?.[0]?.blockName) {
      setFormData((prev) => ({
        ...prev,
        blockName: fetchWorkflowTypes.data[0].blockName,
      }));
    }
  }, [fetchWorkflowTypes.data, formData.blockName]);

  const validateForm = (): boolean => {
    if (formData.blockName) return true;

    setErrors({ name: '', blockName: 'Please select an automation type' });
    return false;
  };

  const navigateToWorkflow = (workflowId: string) => {
    void router.navigateToWorkflow(workflowId);
  };

  const createAndRunWorkflow = (transition?: string, data?: Record<string, any>) => {
    createWorkflow.mutate(
      {
        workflowCreateDto: {
          blockName: formData.blockName,
          title: formData.name || null,
          workspaceId: workspace.id,
          transition: transition ?? null,
          args: data,
        },
      },
      {
        onSuccess: (createdWorkflow) => {
          pingWorkflow.mutate(
            {
              workflowId: createdWorkflow.id,
              runWorkflowPayloadDto: {},
              force: true,
            },
            {
              onSuccess: () => navigateToWorkflow(createdWorkflow.id),
            },
          );
        },
      },
    );
  };

  const handleNext = () => {
    if (!validateForm()) return;

    if (hasArguments) {
      setCurrentStep('arguments');
    } else {
      createAndRunWorkflow();
    }
  };

  const handleBack = () => {
    setCurrentStep('selection');
  };

  const handleSubmit = (transition?: string, data?: Record<string, any>) => {
    createAndRunWorkflow(transition, data);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  if (fetchWorkflowTypes.isLoading) {
    return (
      <div className="flex min-h-50 items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!fetchWorkflowTypes.data) return null;

  return (
    <div className="relative">
      <ErrorSnackbar error={createWorkflow.error} />
      <ErrorSnackbar error={pingWorkflow.error} />
      <ErrorSnackbar error={fetchWorkflowTypes.error} />

      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${currentStep === 'arguments' ? 100 : 0}%)` }}
        >
          {/* Selection View */}
          <div className="w-full shrink-0 px-1">
            <SelectionView
              title={title}
              workflowTypes={fetchWorkflowTypes.data}
              formData={formData}
              errors={errors}
              isLoading={isLoading}
              onInputChange={handleInputChange}
              onNext={handleNext}
            />
          </div>

          {/* Arguments View */}
          <div className="w-full shrink-0 px-1">
            <ArgumentsView
              key={formData.blockName} // forces remount of the component / form when selection is changed
              config={selectedWorkflowConfig}
              hasArguments={hasArguments}
              isLoading={isLoading}
              onBack={handleBack}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowForm;
