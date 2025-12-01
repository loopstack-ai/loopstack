export enum RegistryEntryStatus {
  DRAFT = "draft",
  PENDING = "pending",
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export enum RegistryEntryCategory {
  FULL_AUTOMATIONS = "full-automations",
  TOOLS = "tools",
  WORKFLOWS = "workflows",
  DEMOS_AND_TESTS = "demos-and-tests",
  EXPERIMENTAL = "experimental",
  STARTER_TEMPLATES = "starter-templates",
  INTEGRATIONS = "integrations",
  AGENTS = "agents",
}

export type RegistryCategory = `${RegistryEntryCategory}`;

export const REGISTRY_CATEGORIES: RegistryCategory[] = [
  RegistryEntryCategory.FULL_AUTOMATIONS,
  RegistryEntryCategory.TOOLS,
  RegistryEntryCategory.WORKFLOWS,
  RegistryEntryCategory.DEMOS_AND_TESTS,
  RegistryEntryCategory.EXPERIMENTAL,
  RegistryEntryCategory.STARTER_TEMPLATES,
  RegistryEntryCategory.INTEGRATIONS,
  RegistryEntryCategory.AGENTS,
];
