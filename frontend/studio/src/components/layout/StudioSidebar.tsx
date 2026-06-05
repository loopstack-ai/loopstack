import { Boxes, LayoutGrid, MoreHorizontal, PanelLeftIcon, Play, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useFilterWorkspaces } from '@/hooks/useWorkspaces.ts';
import { cn } from '@/lib/utils';
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
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '../ui/sidebar';

const DefaultSidebarHeader = () => {
  const { state, toggleSidebar } = useSidebar();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <SidebarHeader
      className={cn(
        'border-sidebar-border h-12 w-full flex-row items-center border-b px-1.5 py-0',
        state === 'collapsed' ? 'justify-center' : 'justify-between',
      )}
    >
      {state === 'expanded' && (
        <div className="flex items-center gap-2 overflow-hidden px-1.5">
          <img src="/loopstack.svg" alt="Loopstack" className="h-6 w-6" />
          <motion.span
            className="whitespace-nowrap text-sm font-semibold"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              opacity: { duration: 0.18, delay: 0.12, ease: 'easeOut' },
              x: { duration: 0.18, delay: 0.12, ease: 'easeOut' },
            }}
          >
            Loopstack Studio
          </motion.span>
        </div>
      )}
      <Button
        data-sidebar="trigger"
        data-slot="sidebar-trigger"
        variant="ghost"
        size="icon"
        className={cn(
          'relative size-10 text-muted-foreground hover:cursor-pointer hover:bg-accent/50 hover:text-accent-foreground',
        )}
        onClick={toggleSidebar}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {state === 'collapsed' ? (
          <>
            <motion.img
              src="/loopstack.svg"
              alt="Loopstack"
              className="absolute top-1/2 left-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2"
              initial={{ opacity: 1 }}
              animate={{ opacity: isHovered ? 0 : 1 }}
              transition={{ duration: 0.2 }}
            />
            <motion.div
              className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <PanelLeftIcon className="size-5" />
            </motion.div>
          </>
        ) : (
          <PanelLeftIcon className="size-5" />
        )}
        <span className="sr-only">Toggle Sidebar</span>
      </Button>
    </SidebarHeader>
  );
};

const MainNav = () => {
  const location = useLocation();
  const { router } = useStudio();
  const dashboardPath = router.getDashboard();
  const workspacesPath = router.getWorkspaces();
  const runsPath = router.getRuns();

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={location.pathname === dashboardPath} tooltip="Applications">
              <Link to={dashboardPath}>
                <Boxes />
                <span>Applications</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={location.pathname === workspacesPath} tooltip="Workspaces">
              <Link to={workspacesPath}>
                <LayoutGrid />
                <span>Workspaces</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === runsPath || location.pathname === runsPath + '/'}
              tooltip="Runs"
            >
              <Link to={runsPath}>
                <Play />
                <span>Runs</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

const FavouritesNav = () => {
  const location = useLocation();
  const { router } = useStudio();
  const workspacesPath = router.getWorkspaces();

  const fetchFavourites = useFilterWorkspaces(undefined, { isFavourite: 'true' }, 'createdAt', 'ASC', 0, 10);

  const favourites = fetchFavourites.data?.data ?? [];

  if (favourites.length === 0) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Favourites</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {favourites.map((workspace) => {
            const workspacePath = router.getWorkspace(workspace.id);
            const isActive = location.pathname === workspacePath || location.pathname.startsWith(workspacePath + '/');

            return (
              <SidebarMenuItem key={workspace.id}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={workspace.title}>
                  <Link to={workspacePath}>
                    <Star className="h-4 w-4" />
                    <span>{workspace.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
          {(fetchFavourites.data?.total ?? 0) > 10 && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="More favourites">
                <Link to={workspacesPath}>
                  <MoreHorizontal className="h-4 w-4" />
                  <span>More</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

// const InsightsNav = () => {
//   const location = useLocation();
//   const { router } = useStudio();
//
//   const navItems = [
//     { label: 'Dashboard', href: router.getDashboard(), icon: LayoutDashboard },
//     { label: 'Workflows', href: router.getDebugWorkflows(), icon: Workflow },
//   ];
//
//   return (
//     <SidebarGroup>
//       <SidebarGroupLabel>Insights</SidebarGroupLabel>
//       <SidebarGroupContent>
//         <SidebarMenu>
//           {navItems.map((item) => (
//             <SidebarMenuItem key={item.href}>
//               <SidebarMenuButton asChild isActive={location.pathname === item.href} tooltip={item.label}>
//                 <Link to={item.href}>
//                   <item.icon />
//                   <span>{item.label}</span>
//                 </Link>
//               </SidebarMenuButton>
//             </SidebarMenuItem>
//           ))}
//         </SidebarMenu>
//       </SidebarGroupContent>
//     </SidebarGroup>
//   );
// };

const DefaultSidebarFooter = () => {
  return <SidebarFooter />;
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
            <MainNav />
            <FavouritesNav />
          </>
        )}
      </SidebarContent>

      {studio && <FooterComponent />}
    </Sidebar>
  );
};
