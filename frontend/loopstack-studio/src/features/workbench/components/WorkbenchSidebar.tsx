import { Code, GitGraph } from 'lucide-react';
import type { PipelineDto, WorkspaceDto } from '@loopstack/api-client';
import { Button } from '@/components/ui/button.tsx';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.tsx';
import { CodeExplorer } from '@/features/code-explorer/CodeExplorer';
import { useStudio } from '@/providers/StudioProvider.tsx';
import WorkbenchNavigation from '../WorkbenchNavigation.tsx';
import PipelineHistoryList from './PipelineHistoryList.tsx';

interface WorkbenchSidebarProps {
  namespaceTree: any[];
  pipeline: PipelineDto | undefined;
  workspaceConfig?: Pick<WorkspaceDto, 'volumes' | 'features'>;
}

const WorkbenchSidebar = ({ namespaceTree, pipeline, workspaceConfig }: WorkbenchSidebarProps) => {
  const { router } = useStudio();
  const { open } = useSidebar();

  const features = workspaceConfig?.features;

  const sidebarEnabled = features?.sidebar?.enabled ?? true;
  const debugWorkflowEnabled = features?.debugWorkflow?.enabled ?? true;
  const fileExplorerEnabled = features?.fileExplorer?.enabled ?? false;
  const workflowNavigationEnabled = features?.workflowNavigation?.enabled ?? true;
  const workflowHistoryEnabled = features?.workflowHistory?.enabled ?? true;

  if (!sidebarEnabled) {
    return null;
  }

  const getDefaultTab = () => {
    if (fileExplorerEnabled) return 'codeExplorer';
    if (workflowNavigationEnabled) return 'pipelineNavigation';
    if (workflowHistoryEnabled) return 'pipelineHistory';
    return 'codeExplorer';
  };

  const enabledTabs = [fileExplorerEnabled, workflowNavigationEnabled, workflowHistoryEnabled].filter(Boolean).length;

  return (
    <Sidebar side="right" collapsible="icon" className="workbench-sidebar z-31">
      <SidebarHeader className="border-sidebar-border w-full flex-row items-center justify-between border-b p-2">
        <div className="flex items-center gap-1">
          <SidebarTrigger className="flex h-8 w-8 items-center justify-center hover:cursor-pointer" />
          {pipeline && debugWorkflowEnabled && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => void router.navigateToPipelineDebug(pipeline.id)}
                  >
                    <GitGraph className="text-muted-foreground h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Debug Pipeline Flow</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="flex h-full flex-col">
          {open && (
            <Tabs defaultValue={getDefaultTab()} className="flex h-full w-full flex-col">
              {enabledTabs > 1 && (
                <TabsList className="w-full shrink-0">
                  {fileExplorerEnabled && (
                    <TabsTrigger value="codeExplorer" className="flex items-center gap-1.5">
                      <Code className="h-3.5 w-3.5" />
                      Files
                    </TabsTrigger>
                  )}
                  {workflowNavigationEnabled && <TabsTrigger value="pipelineNavigation">Navigation</TabsTrigger>}
                  {workflowHistoryEnabled && <TabsTrigger value="pipelineHistory">History</TabsTrigger>}
                </TabsList>
              )}

              {fileExplorerEnabled && (
                <TabsContent value="codeExplorer" className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
                  <CodeExplorer />
                </TabsContent>
              )}

              {workflowNavigationEnabled && (
                <TabsContent value="pipelineNavigation" className="mt-2">
                  <SidebarGroupLabel>Pipeline Navigation</SidebarGroupLabel>
                  <SidebarMenu>
                    {pipeline && namespaceTree.length ? (
                      <WorkbenchNavigation namespaceTree={namespaceTree} indent={0} />
                    ) : null}
                  </SidebarMenu>
                </TabsContent>
              )}

              {workflowHistoryEnabled && (
                <TabsContent value="pipelineHistory" className="mt-2">
                  <SidebarGroupLabel>Run History</SidebarGroupLabel>
                  <SidebarMenu>
                    <PipelineHistoryList pipeline={pipeline} />
                  </SidebarMenu>
                </TabsContent>
              )}
            </Tabs>
          )}
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter />
    </Sidebar>
  );
};

export default WorkbenchSidebar;
