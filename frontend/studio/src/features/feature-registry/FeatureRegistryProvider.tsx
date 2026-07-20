import { type ReactNode, createContext, useContext, useMemo } from 'react';
import type { StudioFeatureRegistration } from '@loopstack/contracts/api';
import { useAppsConfig } from '@/hooks/useConfig';
import { AVAILABLE_FEATURES } from './available-features';
import type { StudioFeature } from './types';

const FeatureRegistryContext = createContext<StudioFeature[]>([]);
const BackendFeaturesContext = createContext<StudioFeatureRegistration[]>([]);

export interface FeatureRegistryProviderProps {
  /** App name to scope features to. Must match an `appName` from `/api/v1/config/apps`. */
  appName: string;
  children: ReactNode;
}

function resolveFeatures(backendFeatures: StudioFeatureRegistration[]): StudioFeature[] {
  return backendFeatures
    .filter((bf) => bf.enabled !== false)
    .map((bf) => AVAILABLE_FEATURES[bf.id])
    .filter(Boolean);
}

export function FeatureRegistryProvider({ appName, children }: FeatureRegistryProviderProps) {
  const { data: apps } = useAppsConfig();
  const backendFeatures = useMemo(() => apps?.find((a) => a.appName === appName)?.features ?? [], [apps, appName]);

  const activeFeatures = useMemo(() => resolveFeatures(backendFeatures), [backendFeatures]);

  return (
    <BackendFeaturesContext.Provider value={backendFeatures}>
      <FeatureRegistryContext.Provider value={activeFeatures}>{children}</FeatureRegistryContext.Provider>
    </BackendFeaturesContext.Provider>
  );
}

export function useFeatureRegistry(): StudioFeature[] {
  return useContext(FeatureRegistryContext);
}

/** Returns the backend config for a specific feature, or undefined if not registered. */
export function useFeatureConfig(featureId: string): StudioFeatureRegistration | undefined {
  const features = useContext(BackendFeaturesContext);
  return features.find((f) => f.id === featureId);
}
