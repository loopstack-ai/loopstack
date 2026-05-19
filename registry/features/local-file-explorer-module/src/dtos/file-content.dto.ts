export class FileContentDto {
  path!: string;

  content!: string;

  workflowConfig?: Record<string, unknown>;
}
