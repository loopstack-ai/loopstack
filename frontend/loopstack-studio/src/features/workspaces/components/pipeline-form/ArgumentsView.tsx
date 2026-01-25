import { Loader2, Zap } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { PipelineConfigInterface } from '@loopstack/contracts/types';
import Form from '@/components/dynamic-form/Form.tsx';
import { Button } from '@/components/ui/button.tsx';
import HeaderSection from '@/features/workspaces/components/pipeline-form/HeaderSection.tsx';

const ArgumentsView = ({
  config,
  hasArguments,
  isLoading,
  onBack,
  onSubmit,
}: {
  config?: PipelineConfigInterface;
  hasArguments: boolean;
  isLoading: boolean;
  onBack: () => void;
  onSubmit: (transition?: string, data?: any) => void;
}) => {
  const form = useForm<Record<string, any>>({
    defaultValues: {},
    mode: 'onChange',
  });

  const handleFormSubmit = (transition: string) => (data: Record<string, any>) => {
    console.log('handleSubmit');
    onSubmit(transition, data);
  };

  const handleSubmit = (transition: string) => {
    // use data from react-hook-form
    void form.handleSubmit(handleFormSubmit(transition))();
  };

  return (
    <div className="flex flex-col">
      <HeaderSection
        icon={<Zap className="h-5 w-5" />}
        title={config?.title || config?.blockName || ''}
        description={config?.description}
        showBack={true}
        onBack={onBack}
      />

      <div className="border-border mb-6 max-h-100 overflow-y-auto rounded-md border p-4">
        {hasArguments && config && config.schema ? (
          <Form form={form} schema={config.schema} ui={config.ui} disabled={false} viewOnly={false} />
        ) : (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">No additional configuration required.</p>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          variant="default"
          disabled={isLoading}
          onClick={() => handleSubmit('')}
          size={'lg'}
          className={'font-medium'}
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          Run Now
        </Button>
      </div>
    </div>
  );
};

export default ArgumentsView;
