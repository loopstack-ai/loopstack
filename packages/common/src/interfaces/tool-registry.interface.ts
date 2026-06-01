import type { BaseTool } from '../base/base-tool.js';

/**
 * Registry of all @Tool() singletons discovered at bootstrap.
 *
 * Defined in common as an interface — implemented by ToolRegistryService in core.
 * Inject via `@Inject(TOOL_REGISTRY)`.
 */
export interface ToolRegistry {
  /** Get a tool by its @Tool({ name }) or class name. Throws if not found. */
  get(name: string): BaseTool;
  /** Get multiple tools by name. Throws if any name is not found. */
  getMany(names: string[]): BaseTool[];
  /** Check if a tool is registered under the given name. */
  has(name: string): boolean;
  /** Get all registered tool instances. */
  getAll(): BaseTool[];
}
