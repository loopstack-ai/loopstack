import { useEffect, useState } from 'react';
import { Loader2, Play, RefreshCw } from 'lucide-react';
import ErrorSnackbar from '../../../components/snackbars/ErrorSnackbar';
import { useCreatePipeline } from '../../../hooks/usePipelines.ts';
import { useRunPipeline } from '../../../hooks/useProcessor.ts';
import { usePipelineConfig } from '../../../hooks/useConfig.ts';
import type { PipelineConfigDto, WorkspaceDto } from '@loopstack/api-client';
import { adjectives, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { useStudio } from '../../../providers/StudioProvider.tsx';

interface PipelineFormProps {
  title: string;
  subtitle: string;
  workspace: WorkspaceDto;
  onSuccess?: () => void;
}

const PipelineForm = ({ title, subtitle, workspace }: PipelineFormProps) => {
  const { router } = useStudio();

  const createPipeline = useCreatePipeline();
  const pingPipeline = useRunPipeline();
  const fetchPipelineTypes = usePipelineConfig(workspace.configKey);

  const [formData, setFormData] = useState({
    name: '',
    configKey: ''
  });

  const [errors, setErrors] = useState({
    name: '',
    configKey: ''
  });

  useEffect(() => {
    if (!formData.configKey && fetchPipelineTypes.data?.[0]?.configKey) {
      setFormData((prev) => ({
        ...prev,
        configKey: fetchPipelineTypes.data[0].configKey
      }));
    }
  }, [fetchPipelineTypes.data, formData.configKey]);

  const validateForm = (): boolean => {
    const newErrors = {
      name: '',
      configKey: ''
    };

    if (!formData.configKey) {
      newErrors.configKey = 'Please select an automation type';
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== '');
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    createPipeline.mutate(
      {
        pipelineCreateDto: {
          configKey: formData.configKey,
          title: formData.name ?? null,
          workspaceId: workspace.id
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
              onSuccess: () => {
                router.navigateToPipeline(createdPipeline.data.id);
              }
            }
          );
        }
      }
    );
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const setRandomName = () => {
    const shortName = uniqueNamesGenerator({
      dictionaries: [adjectives, colors],
      separator: '-',
      length: 2,
      style: 'capital'
    });

    setFormData((prev) => ({
      ...prev,
      name: shortName
    }));
  };

  const isLoading = createPipeline.isPending || pingPipeline.isPending;

  if (fetchPipelineTypes.isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!fetchPipelineTypes.data) {
    return null;
  }

  return (
    <>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded-full mb-4">
          <Play className="w-6 h-6 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">{title}</h1>
        <p className="text-muted-foreground text-sm">{subtitle}</p>
      </div>

      <ErrorSnackbar error={createPipeline.error} />
      <ErrorSnackbar error={pingPipeline.error} />
      <ErrorSnackbar error={fetchPipelineTypes.error} />

      <div className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium text-foreground">
            Name (optional)
          </label>
          <div className="relative">
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={isLoading}
              className={`w-full px-3 py-2 pr-10 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                errors.name ? 'border-red-500 focus:ring-red-500' : 'border-input'
              }`}
              required
              autoFocus
            />
            <button
              type="button"
              onClick={setRandomName}
              disabled={isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
              title="Generate new random name"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="automation" className="block text-sm font-medium text-foreground">
            Automation Type
          </label>
          <select
            id="automation"
            value={formData.configKey}
            onChange={(e) => handleInputChange('configKey', e.target.value)}
            disabled={isLoading}
            className={`w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
              errors.configKey ? 'border-red-500 focus:ring-red-500' : 'border-input'
            }`}
          >
            <option value="">Select an automation</option>
            {fetchPipelineTypes.data.map((item: PipelineConfigDto) => (
              <option key={item.configKey} value={item.configKey}>
                {item.title ?? item.configKey}
              </option>
            ))}
          </select>
          {errors.configKey && <p className="text-sm text-red-500 mt-1">{errors.configKey}</p>}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isLoading ? 'Creating...' : 'Run Now'}
        </button>
      </div>
    </>
  );
};

export default PipelineForm;
