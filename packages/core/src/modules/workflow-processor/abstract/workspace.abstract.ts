import { Output, WorkspaceType } from '@loopstack/shared';
import { Block } from './block.abstract';

export abstract class Workspace<TConfig extends WorkspaceType = WorkspaceType> extends Block<TConfig> {

  type = 'workspace';

  @Output()
  args: Record<string, any>; // args prev. options

  public initWorkspace(
    inputs: Record<string, any>,
  ) {
    this.args = inputs || {};
  }
}