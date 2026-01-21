import React from 'react';
import { RectangleHorizontal } from 'lucide-react';
import type { NamespaceTree } from '@/hooks/useNamespaceTree.ts';
import { SidebarMenuDiv, SidebarMenuItem, SidebarMenuSub } from '../../components/ui/sidebar.tsx';
import NavigationItems from './NavigationItems.tsx';

interface WorkbenchNavigationProps {
  namespaceTree: NamespaceTree[];
  indent: number;
}

const WorkbenchNavigation: React.FC<WorkbenchNavigationProps> = ({ namespaceTree, indent }) => {
  const renderNamespaceItemRecursive = (item: NamespaceTree, depth: number): React.ReactNode => {
    return (
      <React.Fragment key={item.id}>
        <SidebarMenuItem>
          <SidebarMenuDiv
            className="hover:bg-accent-sidebar-foreground w-full justify-between"
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            <div className="flex min-w-0 items-center gap-2">
              <RectangleHorizontal className="h-4 w-4 flex-shrink-0 text-gray-500" />
              <span className="truncate">{item.name}</span>
            </div>
          </SidebarMenuDiv>

          <SidebarMenuSub style={{ marginLeft: `${depth * 16 + 8}px` }}>
            <NavigationItems namespace={item} />
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
