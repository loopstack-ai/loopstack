import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ContextService } from '../../common';
import { NamespacesService } from '../../persistence';
import { ContextInterface, NamespaceEntity, NamespacePropsType } from '@loopstack/shared';
import { Block, BlockContext, BlockData } from '../abstract/block.abstract';

@Injectable()
export class NamespaceProcessorService {
  private readonly logger = new Logger(NamespaceProcessorService.name);

  constructor(
    @Inject(forwardRef(() => ContextService))
    private contextService: ContextService,
    @Inject(forwardRef(() => NamespacesService))
    private namespacesService: NamespacesService,
  ) {}

  async createNamespace(
    block: Block,
    props: NamespacePropsType,
  ): Promise<NamespaceEntity> {
    return this.namespacesService.create({
      name: props.label ?? 'Group',
      pipelineId: block.context.pipelineId,
      workspaceId: block.context.workspaceId,
      parent: block.context.namespace,
      createdBy: block.context.userId,
      metadata: props.meta ?? {},
    });
  }

  async cleanupNamespace(
    parentBlock: Block,
    validBlockData: Partial<BlockContext>[],
  ) {
    const newChildNamespaceIds = validBlockData.map((item) => item.namespace?.id).filter(v => !!v);
    const originalChildNamespaces =
      await this.namespacesService.getChildNamespaces(
        parentBlock.context.namespace.id,
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
