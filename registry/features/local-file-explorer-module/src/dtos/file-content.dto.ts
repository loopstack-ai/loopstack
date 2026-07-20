/**
 * Result for a local file read — the file `path`, its `content`, and an optional parsed `workflowConfig`
 * for workflow YAML files.
 *
 * @public
 */
export class FileContentDto {
  path!: string;

  content!: string;

  workflowConfig?: Record<string, unknown>;
}
