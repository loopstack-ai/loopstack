import { Injectable, Logger } from '@nestjs/common';
import type {
  NamespacePropsType,
  PipelineFactoryConfigType,
  PipelineSequenceType,
} from '@loopstack/contracts/types';
import { NamespaceEntity, PipelineEntity } from '@loopstack/common';
import {
  BlockContextType,
  BlockInterface,
  FactoryExecutionContextDto,
  PipelineExecutionContextDto,
  TemplateExpressionEvaluatorService,
} from '../../common';
import { Factory, Pipeline } from '../abstract';
import { NamespacePropsSchema } from '@loopstack/contracts/schemas';
import { NamespacesService } from '../../persistence';

@Injectable()
export class NamespaceProcessorService {
  private readonly logger = new Logger(NamespaceProcessorService.name);

  constructor(
    // @Inject(forwardRef(() => NamespacesService))
    private namespacesService: NamespacesService,
    private templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
  ) {}

  async createRootNamespace(
    pipeline: PipelineEntity,
  ): Promise<NamespaceEntity> {
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

  async initBlockNamespace<T extends Pipeline | Factory>(block: T): Promise<T> {
    const config: PipelineSequenceType | PipelineFactoryConfigType =
      block.config as any;

    if (config.namespace) {
      const namespaceConfig =
        this.templateExpressionEvaluatorService.evaluateTemplate<NamespacePropsType>(
          config.namespace,
          block,
          ['pipeline'],
          NamespacePropsSchema,
        );

      block.ctx.namespace = await this.createNamespace(block, namespaceConfig);
      block.ctx.labels = [...block.ctx.labels, block.ctx.namespace.name];
    }

    return block;
  }

  async createNamespace(
    block: BlockInterface,
    props: NamespacePropsType,
  ): Promise<NamespaceEntity> {
    return this.namespacesService.create({
      name: props.label ?? 'Group',
      pipelineId: block.ctx.pipelineId,
      workspaceId: block.ctx.workspaceId,
      parent: block.ctx.namespace,
      createdBy: block.ctx.userId,
    });
  }

  async cleanupNamespace(
    parentBlockCtx: PipelineExecutionContextDto | FactoryExecutionContextDto,
    validBlockContexts: BlockContextType[],
  ) {
    const newChildNamespaceIds = validBlockContexts
      .map((item) => item.namespace?.id)
      .filter((v) => !!v);
    const originalChildNamespaces =
      await this.namespacesService.getChildNamespaces(
        parentBlockCtx.namespace.id,
      );
    const danglingNamespaces = originalChildNamespaces.filter(
      (item) => !newChildNamespaceIds.includes(item.id),
    );
    if (danglingNamespaces.length) {
      await this.namespacesService.delete(danglingNamespaces);
      this.logger.debug(
        `Removed ${danglingNamespaces.length} dangling namespaces.`,
      );
    }
  }
}
