import { Bug, ChevronDown, ChevronLeft, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarTrigger } from '../ui/menubar';

export function TopMenu() {
  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-12 items-center px-4">
        <Menubar className="border-none bg-transparent shadow-none mr-4">
          <MenubarMenu>
            <MenubarTrigger className="cursor-pointer font-medium data-[state=open]:bg-muted/50 data-[state=open]:text-primary focus:bg-muted/50 focus:text-primary flex gap-2 items-center">
              <img src="/loopstack.svg" alt="Loopstack" className="h-6 w-6" />
              <span>Loopstack Studio</span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </MenubarTrigger>
            <MenubarContent align="start" className="min-w-[200px]">
              <MenubarItem asChild>
                <Link to="/" className="flex w-full cursor-pointer items-center gap-2">
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                  <span>Back to Dashboard</span>
                </Link>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem asChild>
                <Link to="/workspaces" className="flex w-full cursor-pointer items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                  <span>My Workspaces</span>
                </Link>
              </MenubarItem>
              <MenubarItem asChild>
                <Link to="/debug/workflows" className="flex w-full cursor-pointer items-center gap-2">
                  <Bug className="h-4 w-4 text-muted-foreground" />
                  <span>Debug Workflows</span>
                </Link>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>
    </div>
  );
}
