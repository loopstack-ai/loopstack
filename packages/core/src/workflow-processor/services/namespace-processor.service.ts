import { Injectable, Logger } from '@nestjs/common';
import { NamespaceEntity, PipelineEntity } from '@loopstack/common';
import { NamespacesService } from '../../persistence';

@Injectable()
export class NamespaceProcessorService {
  private readonly logger = new Logger(NamespaceProcessorService.name);

  constructor(private namespacesService: NamespacesService) {}

  async createRootNamespace(pipeline: PipelineEntity): Promise<NamespaceEntity> {
    return this.namespacesService.create({
      name: 'Project',
      pipelineId: pipeline.id,
      workspaceId: pipeline.workspaceId,
      metadata: {
        title: pipeline.title,
      },
      createdBy: pipeline.createdBy,
      parent: null,
    });
  }

  // async initBlockNamespace<T extends BlockInterface>(block: T, ctx: RunContext): Promise<RunContext> {
  //   const config = getBlockConfig<WorkflowType>(block);
  //   if (!config) {
  //     throw new Error(`Block ${block.constructor.name} is missing @BlockConfig decorator`);
  //   }
  //
  //   if ('namespace' in config && config.namespace) {
  //     const namespaceConfig = this.templateExpressionEvaluatorService.evaluateTemplate<NamespacePropsType>(
  //       config.namespace,
  //       {}, //getTemplateVars({}), // todo: fix
  //       // block,
  //       // ['pipeline'],
  //       { schema: NamespacePropsSchema },
  //     );
  //
  //     ctx.namespace = await this.namespacesService.create({
  //       name: namespaceConfig.label ?? 'Group',
  //       pipelineId: ctx.pipelineId,
  //       workspaceId: ctx.workspaceId,
  //       parent: ctx.namespace,
  //       createdBy: ctx.userId,
  //     });
  //
  //     ctx.labels = [...ctx.labels, ctx.namespace.name];
  //   }
  //
  //   return ctx;
  // }

  // async cleanupNamespace(parentBlockCtx: RunContext, validBlockContexts: BlockContextType[]) {
  //   const newChildNamespaceIds = validBlockContexts.map((item) => item.namespace?.id).filter((v) => !!v);
  //   const originalChildNamespaces = await this.namespacesService.getChildNamespaces(parentBlockCtx.namespace.id);
  //   const danglingNamespaces = originalChildNamespaces.filter((item) => !newChildNamespaceIds.includes(item.id));
  //   if (danglingNamespaces.length) {
  //     await this.namespacesService.delete(danglingNamespaces);
  //     this.logger.debug(`Removed ${danglingNamespaces.length} dangling namespaces.`);
  //   }
  // }
}
