import * as React from 'react';
import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/button.tsx';
import { Input } from '../../../components/ui/input.tsx';
import { Label } from '../../../components/ui/label.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../../components/ui/select.tsx';
import { Alert, AlertDescription } from '../../../components/ui/alert.tsx';
import { Loader2 } from 'lucide-react';
import { useCreatePipeline, useUpdatePipeline } from '../../../hooks/usePipelines.ts';
import { useRunPipeline } from '../../../hooks/useProcessor.ts';
import { usePipelineConfig } from '../../../hooks/useConfig.ts';
import type { PipelineConfigDto, PipelineItemDto, WorkspaceDto } from '@loopstack/api-client';
import { DialogHeader } from '../../../components/ui/dialog.tsx';
import { DialogTitle } from '@radix-ui/react-dialog';
import { useStudio } from '../../../providers/StudioProvider.tsx';

interface CreatePipelineProps {
  workspace: WorkspaceDto;
  pipeline?: PipelineItemDto;
  onSuccess: () => void;
}

const CreatePipeline = ({ workspace, pipeline, onSuccess }: CreatePipelineProps) => {
  const { router } = useStudio();

  const createPipeline = useCreatePipeline();
  const updatePipeline = useUpdatePipeline();
  const pingPipeline = useRunPipeline();
  const fetchPipelineTypes = usePipelineConfig(workspace.configKey);

  const [configKey, setConfigKey] = useState(() => (pipeline ? pipeline.configKey ?? '' : ''));
  const [name, setName] = useState(pipeline?.title ?? '');

  useEffect(() => {
    if (!pipeline && !configKey && fetchPipelineTypes.data?.[0]?.configKey) {
      setConfigKey(fetchPipelineTypes.data[0].configKey);
    }
  }, [fetchPipelineTypes.data, pipeline, configKey]);

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name || !pipeline) {
      return;
    }

    updatePipeline.mutate(
      {
        id: pipeline.id,
        pipelineUpdateDto: {
          title: name
        }
      },
      {
        onSuccess: () => {
          onSuccess();
        }
      }
    );
  };

  const handleCreate = () => async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!fetchPipelineTypes.data) {
      return;
    }

    if (!configKey || !name) {
      return;
    }

    createPipeline.mutate(
      {
        pipelineCreateDto: {
          configKey: configKey,
          title: name,
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

  const errors = [
    createPipeline.error,
    updatePipeline.error,
    pingPipeline.error,
    fetchPipelineTypes.error
  ].filter(Boolean);

  const isLoading = createPipeline.isPending || pingPipeline.isPending || updatePipeline.isPending;

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
    <div>
      <div className="my-4">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-lg leading-none font-semibold mb-4">
            {pipeline ? 'Edit' : 'Run'} Automation
          </DialogTitle>
        </DialogHeader>
        <div>
          {errors.map(
            (error, index) =>
              error && (
                <Alert key={index} variant="destructive" className="mb-4">
                  <AlertDescription>{error.message || 'An error occurred'}</AlertDescription>
                </Alert>
              )
          )}
          <form onSubmit={pipeline ? handleUpdate : handleCreate()} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                autoComplete="name"
              />
            </div>

            {!pipeline && (
              <div className="space-y-2">
                <Label htmlFor="workflow">Automation</Label>
                <Select name="type" value={configKey} onValueChange={setConfigKey}>
                  <SelectTrigger id="workflow" className="w-full">
                    <SelectValue placeholder="Select a workflow" />
                  </SelectTrigger>
                  <SelectContent>
                    {fetchPipelineTypes.data.map((item: PipelineConfigDto) => (
                      <SelectItem key={item.configKey} value={item.configKey}>
                        {item.title ?? item.configKey}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {pipeline ? 'Save' : 'Run'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePipeline;
