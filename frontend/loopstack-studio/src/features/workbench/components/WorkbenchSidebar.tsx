import type { PipelineDto } from '@loopstack/api-client';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarTrigger,
} from '@/components/ui/sidebar.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import WorkbenchNavigation from '../WorkbenchNavigation.tsx';
import PipelineHistoryList from './PipelineHistoryList.tsx';

interface WorkbenchSidebarProps {
  namespaceTree: any[];
  pipeline: PipelineDto | undefined;
}

const WorkbenchSidebar = ({ namespaceTree, pipeline }: WorkbenchSidebarProps) => {
  return (
    <Sidebar side="right" collapsible="icon" className="workbench-sidebar z-31">
      <SidebarHeader className="border-sidebar-border w-full flex-row justify-between border-b p-2">
        <SidebarTrigger className="flex h-8 w-8 items-center justify-center hover:cursor-pointer" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <Tabs defaultValue="pipelineNavigation" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="pipelineNavigation">Navigation</TabsTrigger>
              <TabsTrigger value="pipelineHistory">History</TabsTrigger>
            </TabsList>

            <TabsContent value="pipelineNavigation">
              <SidebarGroupLabel>Pipeline Navigation</SidebarGroupLabel>
              <SidebarMenu>
                {pipeline && namespaceTree.length ? (
                  <WorkbenchNavigation namespaceTree={namespaceTree} indent={0} />
                ) : null}
              </SidebarMenu>
            </TabsContent>

            <TabsContent value="pipelineHistory">
              <SidebarGroupLabel>Run History</SidebarGroupLabel>
              <SidebarMenu>
                <PipelineHistoryList pipeline={pipeline} />
              </SidebarMenu>
            </TabsContent>
          </Tabs>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter />
    </Sidebar>
  );
};

export default WorkbenchSidebar;
