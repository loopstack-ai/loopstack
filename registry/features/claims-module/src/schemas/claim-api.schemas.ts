import { z } from 'zod';

/** A resource in a tool's arguments. The scope is per resource, so one call can mix them. */
export const RequestedResourceSchema = z.object({
  key: z.string().describe('The resource, e.g. `area:core` or `engineer:runs`.'),
  mode: z
    .enum(['exclusive', 'shared'])
    .describe('`exclusive` admits no other holder; `shared` coexists with other shared holders up to capacity.'),
  scope: z
    .enum(['workflow', 'workspace'])
    .describe('How long it survives: as long as one run, or as long as the workspace.'),
  workspaceId: z.string().describe('The workspace the claim belongs to.'),
  scopeWorkflowId: z.string().optional().describe('The run whose life it follows. Required for `workflow` scope.'),
});

export const ClaimResourceArgsSchema = z.object({
  resources: z.array(RequestedResourceSchema).min(1).describe('Taken as a whole: all of them, or none.'),
  label: z.string().optional().describe('Human text for the report — a ticket reference, say.'),
});
export type ClaimResourceArgs = z.infer<typeof ClaimResourceArgsSchema>;

export const ReleaseResourceArgsSchema = z
  .object({
    claimIds: z.array(z.string()).optional(),
    scopeWorkflowId: z.string().optional().describe('Release every claim scoped to this run.'),
    workspaceId: z.string().optional().describe('Release every claim of this workspace.'),
  })
  .describe('Exactly one way of naming what to release.');
export type ReleaseResourceArgs = z.infer<typeof ReleaseResourceArgsSchema>;

export const CheckResourcesArgsSchema = z.object({
  keys: z.array(z.string()).min(1).describe('The resources to report on.'),
});
export type CheckResourcesArgs = z.infer<typeof CheckResourcesArgsSchema>;
