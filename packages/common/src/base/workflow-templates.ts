/**
 * Function signature for rendering a Handlebars template file.
 *
 * Injected onto `BaseWorkflow.render` and `BaseTool.render`. Author code typically
 * passes an absolute path built with `path.join(__dirname, 'templates', 'foo.md')`.
 *
 * @param path - Absolute path to the template file.
 * @param data - Optional data context passed to Handlebars.
 * @returns The rendered string.
 */
export type TemplateRenderFn = (path: string, data?: Record<string, unknown>) => string;
