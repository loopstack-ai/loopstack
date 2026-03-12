import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, CheckIcon, ChevronDown, Loader2, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { PipelineConfigInterface } from '@loopstack/contracts/types';
import Form from '@/components/dynamic-form/Form.tsx';
import ErrorSnackbar from '@/components/snackbars/ErrorSnackbar.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible.tsx';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DefaultCreateWorkspace from '@/features/workspaces/components/CreateWorkspace.tsx';
import { usePipelineConfig, useWorkspaceConfig } from '@/hooks/useConfig.ts';
import { useCreatePipeline } from '@/hooks/usePipelines.ts';
import { useRunPipeline } from '@/hooks/useProcessor.ts';
import { useFilterWorkspaces } from '@/hooks/useWorkspaces.ts';
import { useComponentOverrides } from '@/providers/ComponentOverridesProvider.tsx';

type Section = 'workspace' | 'automation' | 'config';

interface NewRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (pipelineId: string) => void;
}

export function NewRunDialog({ open, onOpenChange, onSuccess }: NewRunDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] min-h-[300px] !max-w-2xl">
        <DialogTitle>New Run</DialogTitle>
        <NewRunDialogContent open={open} onSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  );
}

function NewRunDialogContent({ open, onSuccess }: { open: boolean; onSuccess: (pipelineId: string) => void }) {
  const [activeSection, setActiveSection] = useState<Section | null>('workspace');
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [selectedBlockName, setSelectedBlockName] = useState<string>('');

  const { CreateWorkspace: CreateWorkspaceOverride } = useComponentOverrides();
  const CreateWorkspace = CreateWorkspaceOverride ?? DefaultCreateWorkspace;
  const fetchWorkspaceTypes = useWorkspaceConfig();

  const fetchWorkspaces = useFilterWorkspaces(undefined, {}, 'title', 'ASC', 0, 100);
  const workspaces = fetchWorkspaces.data?.data ?? [];

  const selectedWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId);
  const fetchPipelineTypes = usePipelineConfig(selectedWorkspace?.blockName);
  const pipelineTypes = fetchPipelineTypes.data ?? [];

  const createPipeline = useCreatePipeline();
  const runPipeline = useRunPipeline();
  const isLoading = createPipeline.isPending || runPipeline.isPending;

  const form = useForm<Record<string, any>>({
    defaultValues: {},
    mode: 'onChange',
  });

  const selectedPipelineConfig: PipelineConfigInterface | undefined = useMemo(() => {
    if (!selectedBlockName || !pipelineTypes.length) return undefined;
    return pipelineTypes.find((p) => p.blockName === selectedBlockName);
  }, [selectedBlockName, pipelineTypes]);

  const hasArguments = !!selectedPipelineConfig?.schema;

  // Auto-select first workspace
  useEffect(() => {
    if (!selectedWorkspaceId && workspaces.length > 0) {
      setSelectedWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, selectedWorkspaceId]);

  // Auto-select first pipeline type when workspace changes
  useEffect(() => {
    if (pipelineTypes.length > 0 && !pipelineTypes.find((p) => p.blockName === selectedBlockName)) {
      setSelectedBlockName(pipelineTypes[0].blockName);
    }
  }, [pipelineTypes, selectedBlockName]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setActiveSection('workspace');
      setShowCreateWorkspace(false);
      setSelectedWorkspaceId('');
      setSelectedBlockName('');
      form.reset({});
      createPipeline.reset();
      runPipeline.reset();
    }
  }, [open]);

  // Auto-advance: workspace selected → open automation
  const handleWorkspaceChange = (id: string) => {
    setSelectedWorkspaceId(id);
    setActiveSection('automation');
  };

  // Auto-advance: automation selected → open config if has args
  const handleBlockNameChange = (name: string) => {
    setSelectedBlockName(name);
    form.reset({});
  };

  // When selectedPipelineConfig changes and has arguments, open config section
  useEffect(() => {
    if (selectedBlockName && selectedPipelineConfig) {
      if (hasArguments) {
        setActiveSection('config');
      }
    }
  }, [selectedPipelineConfig, selectedBlockName, hasArguments]);

  const createAndRun = useCallback(
    (transition?: string, args?: Record<string, any>) => {
      if (!selectedWorkspaceId || !selectedBlockName) return;

      createPipeline.mutate(
        {
          pipelineCreateDto: {
            blockName: selectedBlockName,
            title: null,
            workspaceId: selectedWorkspaceId,
            transition: transition ?? null,
            args: args ?? {},
          },
        },
        {
          onSuccess: (createdPipeline) => {
            runPipeline.mutate(
              {
                pipelineId: createdPipeline.data.id,
                runPipelinePayloadDto: {},
                force: true,
              },
              {
                onSuccess: () => onSuccess(createdPipeline.data.id),
              },
            );
          },
        },
      );
    },
    [selectedWorkspaceId, selectedBlockName, createPipeline, runPipeline, onSuccess],
  );

  const handleRunNow = () => {
    if (hasArguments) {
      void form.handleSubmit((data) => createAndRun('', data))();
    } else {
      createAndRun();
    }
  };

  const canRun = !!selectedWorkspaceId && !!selectedBlockName;

  const toggleSection = (section: Section) => {
    setActiveSection((prev) => (prev === section ? null : section));
  };

  const workspaceComplete = !!selectedWorkspaceId;
  const automationComplete = !!selectedBlockName;
  const automationEnabled = workspaceComplete;
  const configEnabled = automationComplete && hasArguments;

  return (
    <div className="mt-2 overflow-y-auto">
      <ErrorSnackbar error={createPipeline.error} />
      <ErrorSnackbar error={runPipeline.error} />

      <div className="space-y-2">
        {/* Workspace Section */}
        <StepSection
          step={1}
          title="Select Workspace"
          summary={selectedWorkspace?.title}
          isActive={activeSection === 'workspace'}
          isComplete={workspaceComplete && activeSection !== 'workspace'}
          isEnabled={true}
          isLoading={fetchWorkspaces.isLoading}
          onToggle={() => toggleSection('workspace')}
        >
          {showCreateWorkspace ? (
            <div className="pt-2">
              <CreateWorkspace
                types={fetchWorkspaceTypes.data ?? []}
                onSuccess={() => {
                  setShowCreateWorkspace(false);
                }}
              />
            </div>
          ) : (
            <div className="flex gap-2 pt-2">
              <Select value={selectedWorkspaceId} onValueChange={handleWorkspaceChange}>
                <SelectTrigger id="workspace" className="flex-1">
                  <SelectValue placeholder="Select a workspace..." />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>
                      {ws.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => setShowCreateWorkspace(true)}
                className="px-3"
                title="Create new workspace"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </StepSection>

        {/* Workflow Section */}
        <StepSection
          step={2}
          title="Select Workflow"
          summary={
            automationComplete
              ? (pipelineTypes.find((p) => p.blockName === selectedBlockName)?.title ?? selectedBlockName)
              : undefined
          }
          isActive={activeSection === 'automation'}
          isComplete={automationComplete && activeSection !== 'automation'}
          isEnabled={automationEnabled}
          isLoading={fetchPipelineTypes.isLoading}
          onToggle={() => automationEnabled && toggleSection('automation')}
        >
          <div className="pt-2">
            <Select value={selectedBlockName} onValueChange={handleBlockNameChange} disabled={isLoading}>
              <SelectTrigger id="automation" className="w-full">
                <SelectValue placeholder="Select a workflow..." />
              </SelectTrigger>
              <SelectContent>
                {pipelineTypes.map((item) => (
                  <SelectPrimitive.Item
                    key={item.blockName}
                    value={item.blockName}
                    className="focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-pointer flex-col gap-0.5 rounded-sm py-2 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  >
                    <span className="absolute right-2 top-2.5 flex size-3.5 items-center justify-center">
                      <SelectPrimitive.ItemIndicator>
                        <CheckIcon className="size-4" />
                      </SelectPrimitive.ItemIndicator>
                    </span>
                    <SelectPrimitive.ItemText>{item.title ?? item.blockName}</SelectPrimitive.ItemText>
                    {item.description && (
                      <span className="text-muted-foreground text-xs leading-snug">{item.description}</span>
                    )}
                  </SelectPrimitive.Item>
                ))}
              </SelectContent>
            </Select>
          </div>
        </StepSection>

        {/* Configuration Section — only shown when automation has arguments */}
        {hasArguments && (
          <StepSection
            step={3}
            title="Configuration"
            isActive={activeSection === 'config'}
            isComplete={false}
            isEnabled={configEnabled}
            onToggle={() => configEnabled && toggleSection('config')}
          >
            <div className="max-h-72 overflow-y-auto pt-2">
              {selectedPipelineConfig?.schema && (
                <Form
                  form={form}
                  schema={selectedPipelineConfig.schema}
                  ui={selectedPipelineConfig.ui}
                  disabled={false}
                  viewOnly={false}
                />
              )}
            </div>
          </StepSection>
        )}
      </div>

      {/* Run Button */}
      <div className="mt-4 flex justify-end border-t pt-4">
        <Button
          variant="default"
          disabled={!canRun || isLoading}
          onClick={handleRunNow}
          size="lg"
          className="font-medium"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          Run Now
        </Button>
      </div>
    </div>
  );
}

function StepSection({
  step,
  title,
  summary,
  isActive,
  isComplete,
  isEnabled,
  isLoading,
  onToggle,
  children,
}: {
  step: number;
  title: string;
  summary?: string;
  isActive: boolean;
  isComplete: boolean;
  isEnabled: boolean;
  isLoading?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Collapsible open={isActive} onOpenChange={() => onToggle()}>
      <CollapsibleTrigger
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
          isEnabled ? 'hover:bg-muted/50 cursor-pointer' : 'cursor-not-allowed opacity-50'
        }`}
        disabled={!isEnabled}
      >
        {/* Step indicator */}
        <div
          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            isComplete
              ? 'bg-primary text-primary-foreground'
              : isActive
                ? 'border-primary text-primary border-2'
                : 'border-border text-muted-foreground border'
          }`}
        >
          {isComplete ? <Check className="h-3.5 w-3.5" /> : step}
        </div>

        {/* Title */}
        <span className={`flex-1 text-sm font-medium ${isEnabled ? 'text-foreground' : 'text-muted-foreground'}`}>
          {title}
        </span>

        {/* Summary (when collapsed and complete) */}
        {!isActive && isComplete && summary && (
          <span className="text-muted-foreground mr-1 max-w-48 truncate text-sm">{summary}</span>
        )}

        {/* Loading indicator */}
        {isLoading && isActive && <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />}

        {/* Chevron */}
        <ChevronDown className={`text-muted-foreground h-4 w-4 transition-transform ${isActive ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>

      <CollapsibleContent className="px-3 pb-3 pl-13">{children}</CollapsibleContent>
    </Collapsible>
  );
}
