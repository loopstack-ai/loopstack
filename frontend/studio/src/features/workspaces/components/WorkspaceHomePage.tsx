import { Loader2, Play } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { WorkspaceActionInterface, WorkspaceInterface } from '@loopstack/contracts/api';
import Form from '@/components/dynamic-form/Form.tsx';
import ErrorSnackbar from '@/components/feedback/ErrorSnackbar';
import { Button } from '@/components/ui/button.tsx';
import { useCreatePipeline } from '@/hooks/usePipelines.ts';
import { useRunPipeline } from '@/hooks/useProcessor.ts';
import { useStudio } from '@/providers/StudioProvider.tsx';

interface WorkspaceHomePageProps {
  workspace: WorkspaceInterface;
  action: WorkspaceActionInterface;
}

const WorkspaceHomePage = ({ workspace, action }: WorkspaceHomePageProps) => {
  const { router } = useStudio();
  const createPipeline = useCreatePipeline();
  const runPipeline = useRunPipeline();

  const options = action.options ?? {};
  const workflow = options.workflow as string;
  const title = options.title as string | undefined;
  const subtitle = options.subtitle as string | undefined;
  const schema = options.schema as Record<string, any> | undefined;
  const pipelineUi = options.pipelineUi as Record<string, any> | undefined;

  const form = useForm<Record<string, any>>({
    defaultValues: {},
    mode: 'onChange',
  });

  const isLoading = createPipeline.isPending || runPipeline.isPending;
  const hasSchema = !!schema;

  const handleSubmit = (data: Record<string, any>) => {
    createPipeline.mutate(
      {
        pipelineCreateDto: {
          blockName: workflow,
          title: null,
          workspaceId: workspace.id,
          transition: null,
          args: hasSchema ? data : undefined,
        },
      },
      {
        onSuccess: (createdPipeline) => {
          runPipeline.mutate(
            {
              pipelineId: createdPipeline.id,
              runPipelinePayloadDto: {},
              force: true,
            },
            {
              onSuccess: () => {
                void router.navigateToPipeline(createdPipeline.id);
              },
            },
          );
        },
      },
    );
  };

  const onSubmit = () => {
    void form.handleSubmit(handleSubmit)();
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center">
      <ErrorSnackbar error={createPipeline.error} />
      <ErrorSnackbar error={runPipeline.error} />

      {title && <h2 className="mb-2 text-center text-3xl font-bold tracking-tight">{title}</h2>}
      {subtitle && <p className="text-muted-foreground mb-8 text-center text-sm">{subtitle}</p>}

      {hasSchema ? (
        <div className="mb-6 w-full">
          <Form form={form} schema={schema} ui={pipelineUi} disabled={false} viewOnly={false} />
        </div>
      ) : null}

      <div className="flex w-full justify-end">
        <Button variant="default" disabled={isLoading} onClick={onSubmit} size="lg" className="font-medium">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
          Run
        </Button>
      </div>
    </div>
  );
};

export default WorkspaceHomePage;
