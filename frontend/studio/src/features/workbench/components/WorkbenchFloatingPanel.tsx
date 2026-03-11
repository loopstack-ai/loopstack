import { X } from 'lucide-react';
import { SidebarMenu, SidebarProvider } from '@/components/ui/sidebar.tsx';
import { useNamespaceTree } from '@/hooks/useNamespaceTree.ts';
import { cn } from '@/lib/utils';
import WorkbenchNavigation from '../WorkbenchNavigation.tsx';
import { type FloatingPanelId, useWorkbenchLayout } from '../providers/WorkbenchLayoutProvider.tsx';
import PipelineHistoryList from './PipelineHistoryList.tsx';

const PANEL_TITLES: Record<FloatingPanelId, string> = {
  navigation: 'Navigation',
  history: 'History',
};

function NavigationContent() {
  const { pipeline } = useWorkbenchLayout();

  // WorkbenchNavigation uses SidebarMenuDiv which requires useSidebar()
  // We wrap it in a minimal SidebarProvider for compatibility
  return (
    <SidebarProvider defaultOpen className="min-h-0" style={{ '--sidebar-width': '100%' } as React.CSSProperties}>
      <div className="w-full overflow-auto p-2">
        <SidebarMenu>
          <NavigationContentInner pipelineId={pipeline.id} />
        </SidebarMenu>
      </div>
    </SidebarProvider>
  );
}

function NavigationContentInner({ pipelineId }: { pipelineId: string }) {
  const namespaceTree = useNamespaceTree(pipelineId);

  if (!namespaceTree || namespaceTree.length === 0) {
    return <div className="text-muted-foreground py-4 text-center text-sm">No navigation items</div>;
  }

  return <WorkbenchNavigation namespaceTree={namespaceTree} indent={0} />;
}

function HistoryContent() {
  const { pipeline } = useWorkbenchLayout();
  return (
    <div className="overflow-auto p-2">
      <PipelineHistoryList pipeline={pipeline} />
    </div>
  );
}

export function WorkbenchFloatingPanel() {
  const { activeFloatingPanel, closeFloatingPanel } = useWorkbenchLayout();

  if (!activeFloatingPanel) {
    return null;
  }

  return (
    <div
      className={cn(
        'border-l bg-background absolute right-0 top-0 bottom-0 z-20 flex w-80 flex-col shadow-lg',
        'animate-in slide-in-from-right duration-200',
      )}
    >
      <div className="border-b flex h-12 shrink-0 items-center justify-between px-3">
        <span className="text-sm font-medium">{PANEL_TITLES[activeFloatingPanel]}</span>
        <button
          onClick={closeFloatingPanel}
          className="text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {activeFloatingPanel === 'navigation' && <NavigationContent />}
        {activeFloatingPanel === 'history' && <HistoryContent />}
      </div>
    </div>
  );
}
