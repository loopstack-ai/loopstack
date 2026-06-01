import { type ReactNode, createContext, useContext, useMemo } from 'react';
import type { StudioFeatureRegistration } from '@/api/types';
import { useAppsConfig } from '@/hooks/useConfig';
import { AVAILABLE_FEATURES } from './available-features';
import type { StudioFeature } from './types';

const FeatureRegistryContext = createContext<StudioFeature[]>([]);
const BackendFeaturesContext = createContext<StudioFeatureRegistration[]>([]);

export interface FeatureRegistryProviderProps {
  /** Static feature list (fallback when no backend features are available). */
  features?: StudioFeature[];
  children: ReactNode;
}

function resolveFeatures(
  backendFeatures: StudioFeatureRegistration[] | undefined,
  fallback: StudioFeature[],
): StudioFeature[] {
  if (!backendFeatures?.length) return fallback;

  return backendFeatures
    .filter((bf) => bf.enabled !== false)
    .map((bf) => AVAILABLE_FEATURES[bf.id])
    .filter(Boolean);
}

export function FeatureRegistryProvider({ features = [], children }: FeatureRegistryProviderProps) {
  const { data: apps } = useAppsConfig();
  const backendFeatures = apps?.[0]?.features;

  const activeFeatures = useMemo(() => resolveFeatures(backendFeatures, features), [backendFeatures, features]);
  const backendFeaturesValue = useMemo(() => backendFeatures ?? [], [backendFeatures]);

  return (
    <BackendFeaturesContext.Provider value={backendFeaturesValue}>
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
