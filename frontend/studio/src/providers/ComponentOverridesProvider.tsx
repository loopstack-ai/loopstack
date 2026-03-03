import { createContext, useContext } from 'react';
import type { ComponentType, ReactNode } from 'react';
import type { CreateWorkspaceProps } from '../features/workspaces/components/CreateWorkspace.tsx';

export interface ComponentOverrides {
  CreateWorkspace?: ComponentType<CreateWorkspaceProps>;
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
