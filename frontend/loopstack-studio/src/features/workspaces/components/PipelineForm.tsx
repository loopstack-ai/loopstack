import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import ErrorSnackbar from '../../../components/snackbars/ErrorSnackbar.tsx';
import { useCreatePipeline } from '@/hooks/usePipelines.ts';
import { useRunPipeline } from '@/hooks/useProcessor.ts';
import { usePipelineConfig } from '@/hooks/useConfig.ts';
import type { WorkspaceDto } from '@loopstack/api-client';
import { useStudio } from '@/providers/StudioProvider.tsx';
import type { PipelineConfigInterface } from '@loopstack/shared';
import ArgumentsView from '@/features/workspaces/components/pipeline-form/ArgumentsView.tsx';
import SelectionView from '@/features/workspaces/components/pipeline-form/SelectionView.tsx';

interface PipelineFormProps {
  title: string;
  workspace: WorkspaceDto;
  onSuccess?: () => void;
}

type Step = 'selection' | 'arguments';

const PipelineForm = ({ title, workspace }: PipelineFormProps) => {
  const { router } = useStudio();

  const createPipeline = useCreatePipeline();
  const pingPipeline = useRunPipeline();
  const fetchPipelineTypes = usePipelineConfig(workspace.configKey);

  const [currentStep, setCurrentStep] = useState<Step>('selection');
  const [formData, setFormData] = useState({
    name: '',
    configKey: '',
    properties: {}
  });

  const [errors, setErrors] = useState({
    name: '',
    configKey: ''
  });

  const selectedPipelineConfig: PipelineConfigInterface | undefined = useMemo(() => {
    if (!formData.configKey || !fetchPipelineTypes.data) return undefined;
    return fetchPipelineTypes.data.find((p) => p.configKey === formData.configKey);
  }, [formData.configKey, fetchPipelineTypes.data]);

  const hasArguments = !!selectedPipelineConfig?.schema;
  const isLoading = createPipeline.isPending || pingPipeline.isPending;

  useEffect(() => {
    if (!formData.configKey && fetchPipelineTypes.data?.[0]?.configKey) {
      setFormData((prev) => ({
        ...prev,
        configKey: fetchPipelineTypes.data[0].configKey
      }));
    }
  }, [fetchPipelineTypes.data, formData.configKey]);

  const validateForm = (): boolean => {
    if (formData.configKey) return true;

    setErrors({ name: '', configKey: 'Please select an automation type' });
    return false;
  };

  const navigateToPipeline = (pipelineId: string) => {
    router.navigateToPipeline(pipelineId);
  };

  const createAndRunPipeline = (transition?: string, data?: any) => {
    createPipeline.mutate(
      {
        pipelineCreateDto: {
          configKey: formData.configKey,
          title: formData.name || null,
          workspaceId: workspace.id,
          transition,
          args: data,
        }
      },
      {
        onSuccess: (createdPipeline) => {
          pingPipeline.mutate(
            {
              pipelineId: createdPipeline.data.id,
              runPipelinePayloadDto: {},
              force: true
            },
            {
              onSuccess: () => navigateToPipeline(createdPipeline.data.id)
            }
          );
        }
      }
    );
  };

  const handleNext = () => {
    if (!validateForm()) return;

    if (hasArguments) {
      setCurrentStep('arguments');
    } else {
      createAndRunPipeline();
    }
  };

  const handleBack = () => {
    setCurrentStep('selection');
  };

  const handleSubmit = (transition?: string, data?: any) => {
    createAndRunPipeline(transition, data);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  if (fetchPipelineTypes.isLoading) {
    return <div className="flex justify-center items-center min-h-[200px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>;
  }

  if (!fetchPipelineTypes.data) return null;

  return (
    <div className="relative">
      <ErrorSnackbar error={createPipeline.error} />
      <ErrorSnackbar error={pingPipeline.error} />
      <ErrorSnackbar error={fetchPipelineTypes.error} />

      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${currentStep === 'arguments' ? 100 : 0}%)` }}
        >
          {/* Selection View */}
          <div className="w-full flex-shrink-0 px-1">
            <SelectionView
              title={title}
              pipelineTypes={fetchPipelineTypes.data}
              formData={formData}
              errors={errors}
              isLoading={isLoading}
              onInputChange={handleInputChange}
              onNext={handleNext}
            />
          </div>

          {/* Arguments View */}
          <div className="w-full flex-shrink-0 px-1">
            <ArgumentsView
              config={selectedPipelineConfig}
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

export default PipelineForm;