import { Injectable, Logger } from '@nestjs/common';
import { NamespaceEntity, PipelineEntity } from '@loopstack/common';
import { NamespacePropsSchema } from '@loopstack/contracts/schemas';
import type { NamespacePropsType } from '@loopstack/contracts/types';
import {
  BlockContextType,
  BlockExecutionContextDto,
  BlockInterface,
  FactoryExecutionContextDto,
  PipelineExecutionContextDto,
  TemplateExpressionEvaluatorService,
  WorkflowExecutionContextDto,
} from '../../common';
import { NamespacesService } from '../../persistence';
import { WorkflowExecution } from '../interfaces';

@Injectable()
export class NamespaceProcessorService {
  private readonly logger = new Logger(NamespaceProcessorService.name);

  constructor(
    // @Inject(forwardRef(() => NamespacesService))
    private namespacesService: NamespacesService,
    private templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
  ) {}

  async createRootNamespace(pipeline: PipelineEntity): Promise<NamespaceEntity> {
    return this.namespacesService.create({
      name: 'Root',
      pipelineId: pipeline.id,
      workspaceId: pipeline.workspaceId,
      metadata: {
        title: pipeline.title,
      },
      createdBy: pipeline.createdBy,
      parent: null,
    });
  }

  async initBlockNamespace<T extends BlockInterface>(
    block: T,
    ctx: BlockExecutionContextDto,
  ): Promise<BlockExecutionContextDto> {
    if ('namespace' in block.config && block.config.namespace) {
      const namespaceConfig = this.templateExpressionEvaluatorService.evaluateTemplate<NamespacePropsType>(
        block.config.namespace,
        block.getTemplateVars({}, {} as WorkflowExecution), // todo: fix
        // block,
        // ['pipeline'],
        { schema: NamespacePropsSchema },
      );

      ctx.namespace = await this.createNamespace(ctx, namespaceConfig);
      ctx.labels = [...ctx.labels, ctx.namespace.name];
    }

    return ctx;
  }

  async createNamespace(
    ctx: WorkflowExecutionContextDto | PipelineExecutionContextDto | FactoryExecutionContextDto,
    props: NamespacePropsType,
  ): Promise<NamespaceEntity> {
    return this.namespacesService.create({
      name: props.label ?? 'Group',
      pipelineId: ctx.pipelineId,
      workspaceId: ctx.workspaceId,
      parent: ctx.namespace,
      createdBy: ctx.userId,
    });
  }

  async cleanupNamespace(
    parentBlockCtx: PipelineExecutionContextDto | FactoryExecutionContextDto,
    validBlockContexts: BlockContextType[],
  ) {
    const newChildNamespaceIds = validBlockContexts.map((item) => item.namespace?.id).filter((v) => !!v);
    const originalChildNamespaces = await this.namespacesService.getChildNamespaces(parentBlockCtx.namespace.id);
    const danglingNamespaces = originalChildNamespaces.filter((item) => !newChildNamespaceIds.includes(item.id));
    if (danglingNamespaces.length) {
      await this.namespacesService.delete(danglingNamespaces);
      this.logger.debug(`Removed ${danglingNamespaces.length} dangling namespaces.`);
    }
  }
}
