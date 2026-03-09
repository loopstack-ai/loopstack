import { createContext, useContext } from 'react';
import type { ComponentType, ReactNode } from 'react';
import type { WorkspaceConfigDto, WorkspaceItemDto } from '@loopstack/api-client';
import type { CreateWorkspaceProps } from '../features/workspaces/components/CreateWorkspace.tsx';

export interface EditWorkspaceProps {
  types: WorkspaceConfigDto[];
  workspace: WorkspaceItemDto;
  onSuccess: () => void;
}

export interface ComponentOverrides {
  CreateWorkspace?: ComponentType<CreateWorkspaceProps>;
  EditWorkspace?: ComponentType<EditWorkspaceProps>;
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
