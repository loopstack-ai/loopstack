import { Injectable } from '@nestjs/common';
import type { WorkspaceEnvironmentContextDto } from '../dtos/index.js';

/**
 * Abstract base class for apps.
 *
 * An app groups workflows and tools into a named container. During workflow
 * execution, the app instance is wrapped in a proxy that provides read-only
 * access to execution context properties (`userId`, `workspaceId`,
 * `environments`). These properties are populated from the current execution
 * scope — they are NOT set on the class instance itself.
 *
 * App authors extend this class and add `@InjectWorkflow()` / `@InjectTool()`
 * properties for composition:
 *
 * ```ts
 * @App({ uiConfig: { title: 'My App' } })
 * export class MyApp extends BaseApp {
 *   @InjectWorkflow() chatWorkflow: ChatWorkflow;
 *   @InjectTool() myTool: MyTool;
 * }
 * ```
 *
 * Inside workflows and tools, the proxied app is available via `this.ctx.app`:
 * ```ts
 * this.ctx.app.userId       // the user running this execution
 * this.ctx.app.workspaceId  // the workspace entity ID
 * this.ctx.app.chatWorkflow // injected workflow (pass-through)
 * ```
 */
@Injectable()
export abstract class BaseApp {
  /** The user ID for the current execution — provided by the app proxy at runtime */
  readonly userId!: string;

  /** The workspace entity ID for the current execution — provided by the app proxy at runtime */
  readonly workspaceId!: string;

  /** Workspace environments for the current execution — provided by the app proxy at runtime */
  readonly environments!: WorkspaceEnvironmentContextDto[];
}
