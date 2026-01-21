import { BlockConfigType } from '@loopstack/contracts/types';
import {
  BlockInterface,
} from '../../common';
import { WorkflowExecution } from '../interfaces';
import { WorkflowBase } from './workflow-base.abstract';
import { ToolBase } from './tool-base.abstract';
import { z } from 'zod';
import { DocumentBase } from './document-base.abstract';

export abstract class Block<TArgs extends object = any> implements BlockInterface
{
  public type: string = 'undefined';

  static readonly blockConfig: BlockConfigType;

  static readonly blockTools: string[];

  static readonly blockDocuments: string[];

  static readonly blockWorkflows: string[];

  static readonly blockHelpers: string[];

  static readonly argsSchema: z.ZodType | undefined;

  static readonly stateSchema: z.ZodType | undefined;

  static readonly resultSchema: z.ZodType | undefined;

  get name(): string {
    return this.constructor.name;
  }

  get config(): BlockConfigType {
    return (this.constructor as typeof Block).blockConfig;
  }

  get tools(): string[] {
    return (this.constructor as typeof Block).blockTools ?? [];
  }

  get documents(): string[] {
    return (this.constructor as typeof Block).blockDocuments ?? [];
  }

  get workflows(): string[] {
    return (this.constructor as typeof Block).blockWorkflows ?? [];
  }

  get helpers(): string[] {
    return (this.constructor as typeof Block).blockHelpers ?? [];
  }

  get argsSchema(): z.ZodType | undefined {
    return (this.constructor as typeof Block).argsSchema;
  }

  get stateSchema(): z.ZodType | undefined {
    return (this.constructor as typeof Block).stateSchema;
  }

  get resultSchema(): z.ZodType | undefined {
    return (this.constructor as typeof Block).resultSchema;
  }

  public getTemplateVars(args: any, ctx: WorkflowExecution) {
    // todo: restrict / expose ctx.state contents
    return {
      ...ctx.state.getAll(),
      metadata: ctx.state.getAllMetadata(),
      transition: ctx.runtime.transition,
      args,
    };
  }

  validate(args: any): TArgs {
    const schema = this.argsSchema;
    return schema ? schema.parse(args) : args;
  }

  getWorkflow<T extends WorkflowBase>(name: string): T | undefined {
    return this.workflows.includes(name) ? this[name] as T : undefined;
  }

  getTool<T extends ToolBase>(name: string): T | undefined {
    return this.tools.includes(name) ? this[name] as T : undefined;
  }

  getDocument<T extends DocumentBase>(name: string): T | undefined {
    return this.documents.includes(name) ? this[name] as T : undefined;
  }

  getHelper(name: string): Function | undefined {
    return this.helpers.includes(name) ? this[name] : undefined;
  }
}
