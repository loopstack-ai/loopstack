/**
 * Environment slots ride in `StudioAppConfig.extensions['environments']` on
 * the wire — this is Studio's view type for those entries.
 */
export interface StudioEnvironmentSlot {
  id: string;
  title?: string;
  type?: string;
  optional?: boolean;
}
