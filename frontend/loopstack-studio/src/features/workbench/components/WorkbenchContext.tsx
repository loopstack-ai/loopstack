import { createContext } from 'react';

export type WorkbenchState = {
  activeSectionId: string | null;
};

export type WorkbenchContextType = {
  state: WorkbenchState;
  setActiveSectionId: (id: string | null) => void;
} | null;

export const WorkbenchContext = createContext<WorkbenchContextType>(null);
