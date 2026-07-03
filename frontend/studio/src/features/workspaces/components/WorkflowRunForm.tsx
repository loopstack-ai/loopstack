import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { WorkspaceInterface } from '@loopstack/contracts/api';
import type { WorkflowConfigInterface } from '@loopstack/contracts/types';
import type { StudioWorkflowConfig } from '@/api/types';
import ErrorSnackbar from '@/components/feedback/ErrorSnackbar';
import ArgumentsView from '@/features/workspaces/components/workflow-form/ArgumentsView.tsx';
import SelectionView from '@/features/workspaces/components/workflow-form/SelectionView.tsx';
import { useAppsConfig } from '@/hooks/useConfig.ts';
import { useStartWorkflow } from '@/hooks/useProcessor.ts';
import { useStudio } from '@/providers/StudioProvider.tsx';

interface WorkflowFormProps {
  title: string;
  workspace: WorkspaceInterface;
  onSuccess?: () => void;
}

type Step = 'selection' | 'arguments';

const WorkflowForm = ({ title, workspace }: WorkflowFormProps) => {
  const { router } = useStudio();
  const fetchAppsConfig = useAppsConfig();
  const startWorkflow = useStartWorkflow();

  const [currentStep, setCurrentStep] = useState<Step>('selection');
  const [formData, setFormData] = useState({
    name: '',
    workflowName: '',
    properties: {},
  });

  const [errors, setErrors] = useState({
    name: '',
    workflowName: '',
  });

  // Find workflows for this workspace's app
  const studioApp = useMemo(() => {
    if (!fetchAppsConfig.data) return undefined;
    return fetchAppsConfig.data.find((a) => a.appName === workspace.appName);
  }, [fetchAppsConfig.data, workspace.appName]);

  const appWorkflows: StudioWorkflowConfig[] = useMemo(() => {
    if (!studioApp) return [];
    return studioApp.workflows;
  }, [studioApp]);

  // Map workflows to WorkflowConfigInterface for SelectionView compatibility
  const workflowTypes: WorkflowConfigInterface[] = useMemo(() => {
    return appWorkflows.map((wf) => ({
      workflowName: wf.workflowName,
      title: wf.title,
      description: wf.description,
      schema: wf.schema,
    }));
  }, [appWorkflows]);

  const selectedWorkflow: StudioWorkflowConfig | undefined = useMemo(() => {
    if (!formData.workflowName) return undefined;
    return appWorkflows.find((wf) => wf.workflowName === formData.workflowName);
  }, [formData.workflowName, appWorkflows]);

  const selectedWorkflowConfig: WorkflowConfigInterface | undefined = useMemo(() => {
    if (!formData.workflowName || !workflowTypes.length) return undefined;
    return workflowTypes.find((p) => p.workflowName === formData.workflowName);
  }, [formData.workflowName, workflowTypes]);

  const hasArguments = !!selectedWorkflowConfig?.schema;
  const isLoading = startWorkflow.isPending;

  // Auto-select first workflow
  useEffect(() => {
    if (!formData.workflowName && workflowTypes[0]?.workflowName) {
      setFormData((prev) => ({ ...prev, workflowName: workflowTypes[0].workflowName }));
    }
  }, [workflowTypes, formData.workflowName]);

  const validateForm = (): boolean => {
    if (formData.workflowName) return true;
    setErrors({ name: '', workflowName: 'Please select an automation type' });
    return false;
  };

  const runWorkflow = (_transition?: string, data?: Record<string, any>) => {
    if (!selectedWorkflow) return;

    startWorkflow.mutate(
      {
        workflowName: selectedWorkflow.workflowName,
        workspaceId: workspace.id,
        args: data ?? {},
      },
      {
        onSuccess: (result) => void router.navigateToWorkflow(result.workflowId),
      },
    );
  };

  const handleNext = () => {
    if (!validateForm()) return;

    if (hasArguments) {
      setCurrentStep('arguments');
    } else {
      runWorkflow();
    }
  };

  const handleBack = () => {
    setCurrentStep('selection');
  };

  const handleSubmit = (transition?: string, data?: Record<string, any>) => {
    runWorkflow(transition, data);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  if (fetchAppsConfig.isLoading) {
    return (
      <div className="flex min-h-50 items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!workflowTypes.length) return null;

  return (
    <div className="relative">
      <ErrorSnackbar error={startWorkflow.error} />

      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${currentStep === 'arguments' ? 100 : 0}%)` }}
        >
          <div className="w-full shrink-0 px-1">
            <SelectionView
              title={title}
              workflowTypes={workflowTypes}
              formData={formData}
              errors={errors}
              isLoading={isLoading}
              onInputChange={handleInputChange}
              onNext={handleNext}
            />
          </div>

          <div className="w-full shrink-0 px-1">
            <ArgumentsView
              key={formData.workflowName}
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
