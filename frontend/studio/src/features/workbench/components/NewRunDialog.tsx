import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, CheckIcon, ChevronDown, Loader2, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { StudioEndpointConfig, StudioEnvironmentSlot } from '@/api/types';
import Form from '@/components/dynamic-form/Form.tsx';
import ErrorSnackbar from '@/components/feedback/ErrorSnackbar';
import { Button } from '@/components/ui/button.tsx';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible.tsx';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateWorkspace as DefaultCreateWorkspace } from '@/features/workspaces';
import { useAppsConfig } from '@/hooks/useConfig.ts';
import { useExecuteController } from '@/hooks/useProcessor.ts';
import { useFilterWorkspaces } from '@/hooks/useWorkspaces.ts';
import { useComponentOverrides } from '@/providers/ComponentOverridesProvider.tsx';

type Section = 'workspace' | 'automation' | 'config';

interface NewRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (workflowId: string) => void;
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

function NewRunDialogContent({ open, onSuccess }: { open: boolean; onSuccess: (workflowId: string) => void }) {
  const [activeSection, setActiveSection] = useState<Section | null>('workspace');
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [selectedWorkflowName, setSelectedWorkflowName] = useState<string>('');

  const { CreateWorkspace: CreateWorkspaceOverride } = useComponentOverrides();
  const CreateWorkspace = CreateWorkspaceOverride ?? DefaultCreateWorkspace;
  const fetchAppsConfig = useAppsConfig();

  const fetchWorkspaces = useFilterWorkspaces(undefined, {}, 'title', 'ASC', 0, 100);
  const workspaces = fetchWorkspaces.data?.data ?? [];

  const selectedWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId);

  // Find the studio app matching this workspace's module
  const studioApp = useMemo(() => {
    if (!selectedWorkspace || !fetchAppsConfig.data) return undefined;
    return fetchAppsConfig.data.find((a) => a.appName === selectedWorkspace.appName);
  }, [selectedWorkspace, fetchAppsConfig.data]);

  // Controller endpoints scoped to this workspace's module
  const controllerEndpoints: StudioEndpointConfig[] = useMemo(() => {
    if (!studioApp) return [];
    return studioApp.controllers.flatMap((c) => c.endpoints);
  }, [studioApp]);

  // Build app types for CreateWorkspace from apps config
  const appTypes = useMemo(() => {
    if (!fetchAppsConfig.data) return [];
    return fetchAppsConfig.data.map((a) => ({
      appName: a.appName,
      title: a.title,
      environments: (a.extensions?.['environments'] as StudioEnvironmentSlot[]) ?? [],
    }));
  }, [fetchAppsConfig.data]);

  const executeController = useExecuteController();
  const isLoading = executeController.isPending;

  const form = useForm<Record<string, any>>({
    defaultValues: {},
    mode: 'onChange',
  });

  // Selected endpoint config
  const selectedEndpoint: StudioEndpointConfig | undefined = useMemo(() => {
    if (!selectedWorkflowName) return undefined;
    return controllerEndpoints.find((e) => e.workflowName === selectedWorkflowName);
  }, [selectedWorkflowName, controllerEndpoints]);

  const selectedSchema = selectedEndpoint?.schema;
  const hasArguments = !!selectedSchema;

  // Workflow options from controller endpoints
  const workflowOptions = useMemo(() => {
    return controllerEndpoints.map((ep) => ({
      key: ep.workflowName,
      title: ep.title,
      description: ep.description,
    }));
  }, [controllerEndpoints]);

  // Auto-select first workspace
  useEffect(() => {
    if (!selectedWorkspaceId && workspaces.length > 0) {
      setSelectedWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, selectedWorkspaceId]);

  // Auto-select first workflow option
  useEffect(() => {
    if (workflowOptions.length > 0 && !workflowOptions.find((o) => o.key === selectedWorkflowName)) {
      setSelectedWorkflowName(workflowOptions[0].key);
    }
  }, [workflowOptions, selectedWorkflowName]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setActiveSection('workspace');
      setShowCreateWorkspace(false);
      setSelectedWorkspaceId('');
      setSelectedWorkflowName('');
      form.reset({});
      executeController.reset();
    }
  }, [open]);

  // Auto-advance: workspace selected -> open automation
  const handleWorkspaceChange = (id: string) => {
    setSelectedWorkspaceId(id);
    setSelectedWorkflowName('');
    setActiveSection('automation');
  };

  const handleBlockNameChange = (name: string) => {
    setSelectedWorkflowName(name);
    form.reset({});
  };

  // When selection changes and has arguments, open config section
  useEffect(() => {
    if (selectedWorkflowName && hasArguments) {
      setActiveSection('config');
    }
  }, [selectedWorkflowName, hasArguments]);

  const handleRunNow = () => {
    const run = (args?: Record<string, any>) => {
      if (!selectedWorkspaceId || !selectedEndpoint) return;

      executeController.mutate(
        {
          path: selectedEndpoint.path,
          payload: { workspaceId: selectedWorkspaceId, args: args ?? {} },
        },
        { onSuccess: (result) => onSuccess(result.workflowId) },
      );
    };

    if (hasArguments) {
      void form.handleSubmit((data) => run(data))();
    } else {
      run();
    }
  };

  const canRun = !!selectedWorkspaceId && !!selectedWorkflowName;

  const toggleSection = (section: Section) => {
    setActiveSection((prev) => (prev === section ? null : section));
  };

  const workspaceComplete = !!selectedWorkspaceId;
  const automationComplete = !!selectedWorkflowName;
  const automationEnabled = workspaceComplete;
  const configEnabled = automationComplete && hasArguments;

  return (
    <div className="mt-2 overflow-y-auto">
      <ErrorSnackbar error={executeController.error} />

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
                types={appTypes}
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
              ? (workflowOptions.find((o) => o.key === selectedWorkflowName)?.title ?? selectedWorkflowName)
              : undefined
          }
          isActive={activeSection === 'automation'}
          isComplete={automationComplete && activeSection !== 'automation'}
          isEnabled={automationEnabled}
          isLoading={fetchAppsConfig.isLoading}
          onToggle={() => automationEnabled && toggleSection('automation')}
        >
          <div className="pt-2">
            <Select value={selectedWorkflowName} onValueChange={handleBlockNameChange} disabled={isLoading}>
              <SelectTrigger id="automation" className="w-full">
                <SelectValue placeholder="Select a workflow..." />
              </SelectTrigger>
              <SelectContent>
                {workflowOptions.map((item) => (
                  <SelectPrimitive.Item
                    key={item.key}
                    value={item.key}
                    className="focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-pointer flex-col gap-0.5 rounded-sm py-2 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  >
                    <span className="absolute right-2 top-2.5 flex size-3.5 items-center justify-center">
                      <SelectPrimitive.ItemIndicator>
                        <CheckIcon className="size-4" />
                      </SelectPrimitive.ItemIndicator>
                    </span>
                    <SelectPrimitive.ItemText>{item.title}</SelectPrimitive.ItemText>
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
              {selectedSchema && <Form form={form} schema={selectedSchema} disabled={false} viewOnly={false} />}
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
