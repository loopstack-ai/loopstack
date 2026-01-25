export enum RegistryEntryStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum RegistryEntryCategory {
  TOOLS = 'tools',
  EXAMPLES = 'examples',
  BUNDLES = 'bundles',
  MODULES = 'modules',
  INTEGRATIONS = 'integrations',
}

export type RegistryCategory = `${RegistryEntryCategory}`;

export const REGISTRY_CATEGORIES: RegistryCategory[] = [
  RegistryEntryCategory.TOOLS,
  RegistryEntryCategory.EXAMPLES,
  RegistryEntryCategory.BUNDLES,
  RegistryEntryCategory.MODULES,
  RegistryEntryCategory.INTEGRATIONS,
];
