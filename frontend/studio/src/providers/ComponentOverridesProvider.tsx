import { createContext, useContext } from 'react';
import type { ComponentType, ReactNode } from 'react';
import type { WorkspaceConfigInterface, WorkspaceItemInterface } from '@loopstack/contracts/api';
import type { CreateWorkspaceProps } from '../features/workspaces/components/CreateWorkspace.tsx';

export interface EditWorkspaceProps {
  types: WorkspaceConfigInterface[];
  workspace: WorkspaceItemInterface;
  onSuccess: () => void;
}

export interface ComponentOverrides {
  CreateWorkspace?: ComponentType<CreateWorkspaceProps>;
  EditWorkspace?: ComponentType<EditWorkspaceProps>;
  SidebarHeader?: ComponentType;
  SidebarFooter?: ComponentType;
}

const ComponentOverridesContext = createContext<ComponentOverrides>({});

export const ComponentOverridesProvider = ({
  children,
  overrides,
}: {
  children: ReactNode;
  overrides: ComponentOverrides;
}) => {
  return <ComponentOverridesContext.Provider value={overrides}>{children}</ComponentOverridesContext.Provider>;
};

export const useComponentOverrides = () => {
  return useContext(ComponentOverridesContext);
};
