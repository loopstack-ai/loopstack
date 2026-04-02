/**
 * Provides access to workflow templates registered via the `templates`
 * option in the `@Workflow` decorator.
 *
 * Templates are `.md` files using Handlebars syntax.
 * The actual implementation is instantiated and wired by the processor in core.
 */
export interface WorkflowTemplates {
  /** Renders a named template with the given data context */
  render(name: string, data?: Record<string, unknown>): string;
  /** Checks if a template exists */
  has(name: string): boolean;
  /** Returns all available template names */
  names(): string[];
}
