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
} from '../../../components/ui/sidebar.tsx';
import WorkbenchNavigation from '../WorkbenchNavigation.tsx';

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
          <SidebarGroupLabel>Pipeline Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {pipeline && namespaceTree.length ? <WorkbenchNavigation namespaceTree={namespaceTree} indent={0} /> : null}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter></SidebarFooter>
    </Sidebar>
  );
};

export default WorkbenchSidebar;
