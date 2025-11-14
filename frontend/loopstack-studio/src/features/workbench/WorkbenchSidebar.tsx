import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarTrigger,
  SidebarMenu
} from '../../components/ui/sidebar';
import WorkbenchNavigation from './WorkbenchNavigation.tsx';
import type { PipelineDto } from '@loopstack/api-client';

interface WorkbenchSidebarProps {
  namespaceTree: any[];
  pipeline: PipelineDto | undefined;
}

const WorkbenchSidebar = ({ namespaceTree, pipeline }: WorkbenchSidebarProps) => {
  return (
    <Sidebar side="right" collapsible="icon" className="z-31 workbench-sidebar">
      <SidebarHeader className="border-b border-sidebar-border flex-row justify-between p-2 w-full">
        <SidebarTrigger className="flex items-center justify-center hover:cursor-pointer h-8 w-8" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Pipeline Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {pipeline && namespaceTree.length ? (
              <WorkbenchNavigation
                workspaceId={pipeline.workspaceId}
                pipelineId={pipeline.id}
                namespaceTree={namespaceTree}
                indent={0}
              />
            ) : null}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter></SidebarFooter>
    </Sidebar>
  );
};

export default WorkbenchSidebar;
