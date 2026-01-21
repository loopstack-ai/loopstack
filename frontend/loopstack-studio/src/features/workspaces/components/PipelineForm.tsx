import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { WorkspaceDto } from '@loopstack/api-client';
import type { PipelineConfigInterface } from '@loopstack/contracts/types';
import ArgumentsView from '@/features/workspaces/components/pipeline-form/ArgumentsView.tsx';
import SelectionView from '@/features/workspaces/components/pipeline-form/SelectionView.tsx';
import { usePipelineConfig } from '@/hooks/useConfig.ts';
import { useCreatePipeline } from '@/hooks/usePipelines.ts';
import { useRunPipeline } from '@/hooks/useProcessor.ts';
import { useStudio } from '@/providers/StudioProvider.tsx';
import ErrorSnackbar from '../../../components/snackbars/ErrorSnackbar.tsx';

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

  const fetchPipelineTypes = usePipelineConfig(workspace.blockName);

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

  const selectedPipelineConfig: PipelineConfigInterface | undefined = useMemo(() => {
    if (!formData.blockName || !fetchPipelineTypes.data) return undefined;
    return fetchPipelineTypes.data.find((p) => p.blockName === formData.blockName);
  }, [formData.blockName, fetchPipelineTypes.data]);

  const hasArguments = !!selectedPipelineConfig?.schema;
  const isLoading = createPipeline.isPending || pingPipeline.isPending;

  useEffect(() => {
    if (!formData.blockName && fetchPipelineTypes.data?.[0]?.blockName) {
      setFormData((prev) => ({
        ...prev,
        blockName: fetchPipelineTypes.data[0].blockName,
      }));
    }
  }, [fetchPipelineTypes.data, formData.blockName]);

  const validateForm = (): boolean => {
    if (formData.blockName) return true;

    setErrors({ name: '', blockName: 'Please select an automation type' });
    return false;
  };

  const navigateToPipeline = (pipelineId: string) => {
    router.navigateToPipeline(pipelineId);
  };

  const createAndRunPipeline = (transition?: string, data?: any) => {
    createPipeline.mutate(
      {
        pipelineCreateDto: {
          blockName: formData.blockName,
          title: formData.name || null,
          workspaceId: workspace.id,
          transition,
          args: data,
        },
      },
      {
        onSuccess: (createdPipeline) => {
          pingPipeline.mutate(
            {
              pipelineId: createdPipeline.data.id,
              runPipelinePayloadDto: {},
              force: true,
            },
            {
              onSuccess: () => navigateToPipeline(createdPipeline.data.id),
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
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
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
              key={formData.blockName} // forces remount of the component / form when selection is changed
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
