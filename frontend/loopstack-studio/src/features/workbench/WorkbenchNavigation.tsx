import React from 'react';
import { RectangleHorizontal } from 'lucide-react';
import { SidebarMenuDiv, SidebarMenuItem, SidebarMenuSub } from '../../components/ui/sidebar';
import type { NamespaceTree } from '../../hooks/useNamespaceTree.ts';
import WorkbenchNavigationWorkflows from './WorkbenchNavigationWorkflows.tsx';

interface WorkbenchNavigationProps {
  workspaceId: string;
  pipelineId: string;
  namespaceTree: NamespaceTree[];
  indent: number;
}

const WorkbenchNavigation: React.FC<WorkbenchNavigationProps> = ({ namespaceTree, indent }) => {
  const renderNamespaceItemRecursive = (item: NamespaceTree, depth: number): React.ReactNode => {
    return (
      <React.Fragment key={item.id}>
        <SidebarMenuItem>
          <SidebarMenuDiv
            className="w-full justify-between hover:bg-accent-sidebar-foreground"
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <RectangleHorizontal className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="truncate">{item.name}</span>
            </div>
          </SidebarMenuDiv>

          <SidebarMenuSub style={{ marginLeft: `${depth * 16 + 8}px` }}>
            <WorkbenchNavigationWorkflows namespace={item} />
          </SidebarMenuSub>
        </SidebarMenuItem>

        {item.childNodes?.map((child) => renderNamespaceItemRecursive(child, depth + 1))}
      </React.Fragment>
    );
  };

  if (!namespaceTree || namespaceTree.length === 0) {
    return null;
  }

  return <>{namespaceTree.map((item) => renderNamespaceItemRecursive(item, indent))}</>;
};

export default WorkbenchNavigation;
