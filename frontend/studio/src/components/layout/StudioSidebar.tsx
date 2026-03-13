import { CircleAlert, Info, LayoutDashboard, LayoutGrid, Play, Workflow } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useFilterPipelines } from '@/hooks/usePipelines.ts';
import { useComponentOverrides } from '@/providers/ComponentOverridesProvider.tsx';
import { useStudio, useStudioOptional } from '@/providers/StudioProvider.tsx';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '../ui/sidebar';

const DefaultSidebarHeader = () => {
  const { state } = useSidebar();

  return (
    <SidebarHeader className="border-sidebar-border h-12 w-full flex-row items-center justify-between border-b px-1.5 py-0">
      {state === 'expanded' && (
        <div className="flex items-center gap-2 px-1.5">
          <img src="/loopstack.svg" alt="Loopstack" className="h-6 w-6" />
          <span className="text-sm font-semibold">Loopstack Studio</span>
        </div>
      )}
      <SidebarTrigger className="hover:cursor-pointer" />
    </SidebarHeader>
  );
};

const RunsNav = () => {
  const location = useLocation();
  const { router } = useStudio();
  const runsPath = router.getRuns();
  const actionRequiredPath = router.getRunsActionRequired();

  const fetchPaused = useFilterPipelines(undefined, { parentId: null, status: 'paused' }, 'createdAt', 'DESC', 0, 1);
  const pausedCount = fetchPaused.data?.total ?? 0;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Runs</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === runsPath || location.pathname === runsPath + '/'}
              tooltip="Overview"
            >
              <Link to={runsPath}>
                <Play />
                <span>Overview</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={location.pathname === actionRequiredPath} tooltip="Action Required">
              <Link to={actionRequiredPath}>
                <CircleAlert />
                <span>Action Required</span>
              </Link>
            </SidebarMenuButton>
            {pausedCount > 0 && <SidebarMenuBadge>{pausedCount}</SidebarMenuBadge>}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

const WorkspacesNav = () => {
  const location = useLocation();
  const { router } = useStudio();
  const workspacesPath = router.getWorkspaces();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Workspaces</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === workspacesPath || location.pathname.startsWith(workspacesPath + '/')}
              tooltip="My Workspaces"
            >
              <Link to={workspacesPath}>
                <LayoutGrid />
                <span>My Workspaces</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

const InsightsNav = () => {
  const location = useLocation();
  const { router } = useStudio();

  const navItems = [
    { label: 'Dashboard', href: router.getDashboard(), icon: LayoutDashboard },
    { label: 'Workflows', href: router.getDebugWorkflows(), icon: Workflow },
  ];

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Insights</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={location.pathname === item.href} tooltip={item.label}>
                <Link to={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

const DefaultSidebarFooter = () => {
  const location = useLocation();
  const { router } = useStudio();
  const infoPath = router.getEnvironmentInfo();

  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={location.pathname === infoPath} size="sm" tooltip="Info">
            <Link to={infoPath}>
              <Info />
              <span>Info</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
};

export const StudioSidebar = () => {
  const overrides = useComponentOverrides();
  const studio = useStudioOptional();
  const HeaderComponent = overrides.SidebarHeader ?? DefaultSidebarHeader;
  const FooterComponent = overrides.SidebarFooter ?? DefaultSidebarFooter;

  return (
    <Sidebar collapsible="icon">
      <HeaderComponent />

      <SidebarContent>
        {studio && (
          <>
            <RunsNav />
            <WorkspacesNav />
            <InsightsNav />
          </>
        )}
      </SidebarContent>

      {studio && <FooterComponent />}
    </Sidebar>
  );
};
