import { Loader2, Zap } from 'lucide-react';
import type { PipelineConfigInterface } from '@loopstack/shared';
import { Button } from '@/components/ui/button.tsx';
import Form from '@/components/dynamic-form/Form.tsx';
import { useForm } from 'react-hook-form';
import HeaderSection from '@/features/workspaces/components/pipeline-form/HeaderSection.tsx';

const ArgumentsView = ({
                         config,
                         hasArguments,
                         isLoading,
                         onBack,
                         onSubmit
                       }: {
  config?: PipelineConfigInterface;
  hasArguments: boolean;
  isLoading: boolean;
  onBack: () => void;
  onSubmit: (transition?: string, data?: any) => void;
}) => {

  const form = useForm<Record<string, any>>({
    defaultValues: {},
    mode: 'onChange'
  });

  const handleFormSubmit = (transition: string) => (data: Record<string, any>) => {
    console.log('handleSubmit')
    onSubmit(transition, data);
  }

  const handleSubmit = (transition: string) => {
    // use data from react-hook-form
    form.handleSubmit(handleFormSubmit(transition))();
  };

  return <div className="flex flex-col h-full">
    <HeaderSection
      icon={<Zap className="w-5 h-5 text-primary-foreground" />}
      title={config?.title || config?.configKey || ''}
      description={config?.description}
      showBack={true}
      onBack={onBack}
    />

    <div className="flex-1 overflow-y-auto mb-6 px-1">
      {hasArguments && config ? (
        <>
          <div className="text-xs text-center text-muted-foreground mb-1">Arguments</div>
        <div className="space-y-4 border border-border rounded-lg px-4">
          <Form
            form={form}
            schema={config.schema}
            ui={config.ui?.form}
            disabled={false}
            viewOnly={false}
          />
        </div>
        </>
      ) : (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No additional configuration required.</p>
        </div>
      )}
    </div>

    <div className="pt-4">
      <Button
        variant="default"
        disabled={isLoading}
        onClick={() => handleSubmit('')}
        size={'lg'}
        className={'w-full font-medium'}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        Run Now
      </Button>
    </div>
  </div>;
};


export default ArgumentsView;