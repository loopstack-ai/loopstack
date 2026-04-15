import { type ReactNode, createContext, useContext, useMemo } from 'react';
import type { StudioFeature } from './types';

const FeatureRegistryContext = createContext<StudioFeature[]>([]);

export interface FeatureRegistryProviderProps {
  features?: StudioFeature[];
  children: ReactNode;
}

export function FeatureRegistryProvider({ features = [], children }: FeatureRegistryProviderProps) {
  const value = useMemo(() => features, [features]);
  return <FeatureRegistryContext.Provider value={value}>{children}</FeatureRegistryContext.Provider>;
}

export function useFeatureRegistry(): StudioFeature[] {
  return useContext(FeatureRegistryContext);
}
