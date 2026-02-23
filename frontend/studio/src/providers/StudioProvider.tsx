import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { Environment, StudioRouter } from '../types';

interface StudioContext {
  router: StudioRouter;
  environment: Environment;
}

const StudioContext = createContext<StudioContext | null>(null);

export const StudioProvider = ({
  children,
  router,
  environment,
}: {
  children: ReactNode;
  router: StudioRouter;
  environment: Environment;
}) => {
  return <StudioContext.Provider value={{ router, environment }}>{children}</StudioContext.Provider>;
};

export const useStudio = () => {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error('useStudio must be used within StudioProvider');
  }
  return context;
};
