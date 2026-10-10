import { useMemo } from 'react';
import type { AppConfigInterface } from '@loopstack/contracts/api';
import type { StudioEnvironmentSlot } from '@/api/types.ts';
import { useAppsConfig } from '@/hooks/useConfig.ts';

/**
 * The app types a workspace can be created from, shaped as the create/edit form takes them — the app's
 * name and title plus the environment slots it declares, which the form turns into slot pickers.
 */
export function useAppTypes(): { types: AppConfigInterface[]; isPending: boolean } {
  const fetchAppsConfig = useAppsConfig();

  const types = useMemo(
    () =>
      (fetchAppsConfig.data ?? []).map((app) => ({
        appName: app.appName,
        title: app.title,
        environments: (app.extensions?.['environments'] as StudioEnvironmentSlot[]) ?? [],
      })),
    [fetchAppsConfig.data],
  );

  return { types, isPending: fetchAppsConfig.isPending };
}
